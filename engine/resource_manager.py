from __future__ import annotations
import os, shutil
from pathlib import Path
try:
 import psutil
except ImportError:
 psutil=None
class ResourceManager:
 def __init__(self,workspace: str|Path): self.workspace=Path(workspace)
 def snapshot(self)->dict:
  self.workspace.mkdir(parents=True,exist_ok=True)
  disk=shutil.disk_usage(self.workspace)
  try:
   import torch
   cuda=torch.cuda.is_available(); devices=[]
   if cuda:
    for i in range(torch.cuda.device_count()):
     p=torch.cuda.get_device_properties(i); free,total=torch.cuda.mem_get_info(i)
     devices.append({"index":i,"name":p.name,"total_bytes":int(total),"free_bytes":int(free),"allocated_bytes":int(torch.cuda.memory_allocated(i) )})
  except Exception as exc: cuda=False; devices=[]; torch_error=f"Torch GPU probe unavailable: {type(exc).__name__}: {exc}"
  result={"python":__import__("sys").version.split()[0],"os":__import__("platform").platform(),"cpu_count":os.cpu_count() or 1,"ram_total_bytes":None,"ram_available_bytes":None,"disk_total_bytes":disk.total,"disk_free_bytes":disk.free,"workspace":str(self.workspace.resolve()),"cuda_available":cuda,"gpus":devices}
  if psutil:
   vm=psutil.virtual_memory(); result.update(ram_total_bytes=vm.total,ram_available_bytes=vm.available)
  else:
   try:
    pages=__import__("os").sysconf("SC_PHYS_PAGES"); page_size=__import__("os").sysconf("SC_PAGE_SIZE"); result["ram_total_bytes"]=pages*page_size
   except (ValueError,OSError,AttributeError) as exc:
    result["ram_measurement_note"]=f"OS memory measurement unavailable: {type(exc).__name__}: {exc}"
   try:
    meminfo=Path("/proc/meminfo").read_text(encoding="utf-8")
    parsed={line.split(":",1)[0]:int(line.split()[1])*1024 for line in meminfo.splitlines() if ":" in line and line.split()[1].isdigit()}
    result["ram_total_bytes"]=result["ram_total_bytes"] or parsed.get("MemTotal")
    result["ram_available_bytes"]=parsed.get("MemAvailable")
   except (OSError,ValueError,IndexError) as exc:
    result["ram_available_bytes"]=None
    result["ram_measurement_note"]=result.get("ram_measurement_note",f"/proc/meminfo unavailable: {type(exc).__name__}: {exc}")
  if "torch_error" in locals(): result["torch_probe_note"]=torch_error
  return result
 def require_disk(self,bytes_needed:int)->None:
  free=shutil.disk_usage(self.workspace).free
  if bytes_needed<0 or free < bytes_needed: raise OSError(f"Insufficient disk space: need {bytes_needed} bytes, have {free}")
