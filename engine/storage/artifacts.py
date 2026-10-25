from __future__ import annotations
import hashlib, json, os, tempfile
from pathlib import Path
class ArtifactManager:
 def __init__(self,workspace:str|Path): self.workspace=Path(workspace); self.root=self.workspace/"artifacts"; self.root.mkdir(parents=True,exist_ok=True)
 def safe_path(self,name:str)->Path:
  p=Path(name)
  if p.is_absolute() or ".." in p.parts: raise ValueError("Artifact path traversal rejected")
  target=(self.root/p).resolve()
  if self.root.resolve() not in target.parents and target!=self.root.resolve(): raise ValueError("Artifact path escapes artifact directory")
  target.parent.mkdir(parents=True,exist_ok=True); return target
 def write_bytes(self,name:str,data:bytes)->Path:
  path=self.safe_path(name)
  fd,temp=tempfile.mkstemp(prefix=".tmp-",dir=str(path.parent))
  try:
   with os.fdopen(fd,"wb") as f: f.write(data); f.flush(); os.fsync(f.fileno())
   os.replace(temp,path)
  finally:
   if os.path.exists(temp): os.unlink(temp)
  return path
 def write_json(self,name:str,value)->Path: return self.write_bytes(name,json.dumps(value,ensure_ascii=False,indent=2,default=str).encode("utf-8"))
 def list(self)->list[dict]:
  out=[]
  for p in self.root.rglob("*"):
   if p.is_file(): out.append({"path":str(p.relative_to(self.root)),"size_bytes":p.stat().st_size,"sha256":sha256_file(p)})
  return out

def sha256_file(path):
 h=hashlib.sha256()
 with Path(path).open("rb") as f:
  for chunk in iter(lambda:f.read(1024*1024),b""):h.update(chunk)
 return h.hexdigest()
