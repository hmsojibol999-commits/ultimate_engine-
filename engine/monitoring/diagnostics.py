from __future__ import annotations
import importlib.util, shutil, sys, os, time
from pathlib import Path
from engine.resource_manager import ResourceManager

def preflight(workspace:str|Path)->dict:
 root=Path(workspace); root.mkdir(parents=True,exist_ok=True)
 probes={"httpx":"httpx","gradio":"gradio","polars":"polars","duckdb":"duckdb","pyarrow":"pyarrow","pydantic":"pydantic","trafilatura":"trafilatura","beautifulsoup4":"bs4","pymupdf":"fitz","playwright":"playwright","transformers":"transformers","torch":"torch","pytesseract":"pytesseract","rapidfuzz":"rapidfuzz"}
 packages={name:{"installed":importlib.util.find_spec(mod) is not None,"module":mod} for name,mod in probes.items()}
 try:
  test=root/".write-test"; test.write_text("ok",encoding="utf-8"); test.unlink(); writable=True; write_error=None
 except OSError as exc: writable=False; write_error=f"{type(exc).__name__}: {exc}"
 browser_package=packages["playwright"]["installed"]; browser_path=None; browser_binary=False; browser_note=None
 if browser_package:
  try:
   from playwright.sync_api import sync_playwright
   with sync_playwright() as p: browser_path=p.chromium.executable_path; browser_binary=Path(browser_path).is_file()
   if not browser_binary: browser_note="Playwright package is installed but Chromium binary is missing; run python -m playwright install chromium"
  except Exception as exc: browser_note=f"Browser probe failed: {type(exc).__name__}: {exc}"
 try:
  import torch
  cuda=torch.cuda.is_available(); gpus=[]
  if cuda:
   for i in range(torch.cuda.device_count()):
    free,total=torch.cuda.mem_get_info(i); gpus.append({"index":i,"name":torch.cuda.get_device_name(i),"free_bytes":int(free),"total_bytes":int(total),"allocated_bytes":int(torch.cuda.memory_allocated(i))})
 except ImportError: cuda=False; gpus=[]
 net={"state":"NOT_TESTED","detail":"Set ENGINE_PREFLIGHT_NETWORK_CHECK=1 to test a public HTTPS HEAD request."}
 if os.environ.get("ENGINE_PREFLIGHT_NETWORK_CHECK","1").lower() not in ("0","false","no","off"):
  try:
   import httpx
   started=time.monotonic(); response=httpx.head("https://huggingface.co",timeout=2.5,follow_redirects=True)
   net={"state":"AVAILABLE" if response.status_code<500 else "AVAILABLE_WITH_LIMITATIONS","status_code":response.status_code,"elapsed_seconds":round(time.monotonic()-started,3),"target":"https://huggingface.co"}
  except Exception as exc: net={"state":"UNAVAILABLE_OR_BLOCKED","error":f"{type(exc).__name__}: {exc}"[:500],"target":"https://huggingface.co"}
 kaggle=Path("/kaggle/working"); kaggle_info={"exists":kaggle.is_dir(),"writable":None,"disk_free_bytes":None}
 if kaggle.is_dir():
  try:
   import tempfile
   with tempfile.NamedTemporaryFile(dir=kaggle,prefix=".engine-preflight-",delete=True) as probe_file:
    probe_path=Path(probe_file.name)
    probe_file.write(b"ok"); probe_file.flush()
   kaggle_info["writable"]=probe_path.is_file()
   disk=shutil.disk_usage(kaggle); kaggle_info.update(disk_free_bytes=disk.free,disk_total_bytes=disk.total)
  except OSError as exc: kaggle_info["writable"]=False; kaggle_info["error"]=f"{type(exc).__name__}: {exc}"
 cache_candidates=[Path(os.environ.get("ENGINE_MODEL_CACHE","./model_cache")),Path(os.environ.get("HUGGINGFACE_HUB_CACHE",str(Path.home()/".cache/huggingface/hub"))),Path(os.environ.get("HF_HOME",str(Path.home()/".cache/huggingface")))/"hub"]
 cache_dirs=[]
 for candidate in cache_candidates:
  resolved=candidate.expanduser().resolve()
  if resolved not in cache_dirs: cache_dirs.append(resolved)
 cache_info=[]
 for candidate in cache_dirs:
  if candidate.exists(): cache_info.append({"path":str(candidate),"exists":True,"entries":len(list(candidate.iterdir())) if candidate.is_dir() else 1})
 return {"python":sys.version,"os":__import__("platform").platform(),"cpu_count":os.cpu_count() or 1,"resources":ResourceManager(root).snapshot(),"packages":packages,"nodejs":shutil.which("node"),"tesseract_binary":shutil.which("tesseract"),"browser":{"package_importable":browser_package,"binary_available":browser_binary,"executable_path":browser_path,"note":browser_note},"gpu":{"cuda_available":cuda,"devices":gpus},"workspace_writable":writable,"workspace_write_error":write_error,"kaggle_working":kaggle_info,"network":net,"model_cache_candidates":cache_info,"estimated_temporary_working_space_bytes":250_000_000,"required_core_missing":[k for k,v in packages.items() if k in ("httpx","gradio","polars","duckdb") and not v["installed"]]}
