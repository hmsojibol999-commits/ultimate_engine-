from __future__ import annotations
import importlib.util, os, threading, time
from pathlib import Path
from engine.exceptions import CapabilityUnavailable
class ModelManager:
 def __init__(self,model_id:str,cache_dir:str|Path,max_new_tokens:int=512,context_length:int=4096,temperature:float=0.2):
  self.model_id=model_id; self.cache_dir=Path(cache_dir); self.max_new_tokens=max_new_tokens; self.context_length=context_length; self.temperature=temperature; self.tokenizer=None; self.model=None; self.status="NOT_LOADED"; self.error=None; self.last_latency=None; self._lock=threading.Lock()
 def inspect(self)->dict:
  cache=str(self.cache_dir); cached=any(self.cache_dir.glob("models--*")) if self.cache_dir.exists() else False
  result={"model_id":self.model_id,"cache_dir":cache,"model_cached":cached,"status":self.status,"error":self.error,"last_latency_seconds":self.last_latency,"loaded":self.model is not None}
  try:
   import torch
   result["cuda_available"]=torch.cuda.is_available(); result["gpus"]=[]
   if torch.cuda.is_available():
    for i in range(torch.cuda.device_count()):
     free,total=torch.cuda.mem_get_info(i); result["gpus"].append({"index":i,"name":torch.cuda.get_device_name(i),"free_bytes":int(free),"total_bytes":int(total)})
  except ImportError: result["cuda_available"]=False; result["torch_available"]=False
  return result
 def load(self,allow_download:bool=False,minimum_free_vram_bytes:int=5_000_000_000)->dict:
  with self._lock:
   if self.model is not None: return self.inspect()
   if importlib.util.find_spec("torch") is None or importlib.util.find_spec("transformers") is None:
    self.status="DEPENDENCY_MISSING"; raise CapabilityUnavailable("Install optional torch/transformers compatible with the runtime; model was not loaded")
   try:
    import torch
    from transformers import AutoModelForCausalLM,AutoTokenizer
    self.cache_dir.mkdir(parents=True,exist_ok=True)
    local_only=not allow_download
    gpu=False
    if torch.cuda.is_available():
     free_by_gpu=[int(torch.cuda.mem_get_info(i)[0]) for i in range(torch.cuda.device_count())]
     # Select one GPU with enough free VRAM; never assume VRAM aggregates across devices.
     gpu=bool(free_by_gpu and max(free_by_gpu)>=minimum_free_vram_bytes)
    self.status="LOADING"
    tokenizer=AutoTokenizer.from_pretrained(self.model_id,cache_dir=str(self.cache_dir),local_files_only=local_only)
    kwargs={"cache_dir":str(self.cache_dir),"local_files_only":local_only,"low_cpu_mem_usage":True}
    if gpu:
     kwargs["device_map"]={"":int(max(range(len(torch.cuda.device_count() and [torch.cuda.mem_get_info(i)[0] for i in range(torch.cuda.device_count())] or [0]), key=lambda i: torch.cuda.mem_get_info(i)[0])))}
     selected_gpu=max(range(len(free_by_gpu)),key=lambda i:free_by_gpu[i])
     kwargs["device_map"]={"":selected_gpu}
     if importlib.util.find_spec("bitsandbytes") is not None:
      from transformers import BitsAndBytesConfig
      kwargs["quantization_config"]=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16)
     elif free_by_gpu[selected_gpu] >= 14_000_000_000:
      kwargs["torch_dtype"]=torch.float16
     else:
      self.status="RESOURCE_INSUFFICIENT"
      raise CapabilityUnavailable("bitsandbytes is missing and the selected GPU has under 14 GB free; install the optional quantization backend or free GPU memory")
    else:
     available_ram=None
     try:
      import psutil
      available_ram=int(psutil.virtual_memory().available)
     except ImportError as exc:
      self.status="RESOURCE_INSUFFICIENT"
      raise CapabilityUnavailable("No CUDA device and psutil is unavailable for a safe CPU-memory estimate") from exc
     if available_ram < 28_000_000_000:
      self.status="RESOURCE_INSUFFICIENT"
      raise CapabilityUnavailable(f"No suitable GPU; CPU loading requires about 28 GB available RAM for this unquantized 7B path, detected {available_ram} bytes")
     kwargs["torch_dtype"]=torch.float32
    model=AutoModelForCausalLM.from_pretrained(self.model_id,**kwargs)
    if not gpu: model.to("cpu")
    self.tokenizer=tokenizer; self.model=model; self.status="AVAILABLE"; self.error=None
    return self.inspect()
   except Exception as exc:
    self.status="FAILED"; self.error=f"{type(exc).__name__}: {exc}"[:1000]; raise CapabilityUnavailable(self.error) from exc
 def unload(self)->dict:
  with self._lock:
   self.model=None; self.tokenizer=None
   try:
    import torch
    if torch.cuda.is_available(): torch.cuda.empty_cache()
   except ImportError as exc:
    self.error=f"Torch cache cleanup unavailable: {type(exc).__name__}"
   self.status="NOT_LOADED"; return self.inspect()
 def generate(self,prompt:str,max_new_tokens:int|None=None)->str:
  with self._lock:
   if self.model is None or self.tokenizer is None: raise CapabilityUnavailable("No local model loaded. Use deterministic functions or explicitly load a model.")
   import torch
   started=time.monotonic(); tokenized=self.tokenizer(prompt[:max(2000,self.context_length*4)],return_tensors="pt",truncation=True,max_length=self.context_length)
   try:
    device=next(self.model.parameters()).device
    tokenized={k:v.to(device) for k,v in tokenized.items()}
   except (StopIteration,AttributeError) as exc:
    raise CapabilityUnavailable(f"Cannot determine model input device: {type(exc).__name__}") from exc
   with torch.inference_mode(): out=self.model.generate(**tokenized,max_new_tokens=max(1,min(max_new_tokens or self.max_new_tokens,8192)),do_sample=self.temperature>0,temperature=max(self.temperature,0.01),pad_token_id=self.tokenizer.eos_token_id)
   result=self.tokenizer.decode(out[0][tokenized["input_ids"].shape[-1]:],skip_special_tokens=True); self.last_latency=time.monotonic()-started; return result
