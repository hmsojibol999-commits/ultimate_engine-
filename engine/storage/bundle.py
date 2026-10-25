from __future__ import annotations
import json, zipfile
from pathlib import Path
from .artifacts import sha256_file

def verify_zip(path:str|Path)->dict:
 p=Path(path)
 with zipfile.ZipFile(p) as zf:
  bad=zf.testzip(); names=zf.namelist()
  if bad: raise ValueError(f"Corrupt ZIP member: {bad}")
  if len(names)!=len(set(names)): raise ValueError("ZIP contains duplicate paths")
  for name in names:
   pp=Path(name)
   if pp.is_absolute() or ".." in pp.parts: raise ValueError(f"Unsafe ZIP path: {name}")
 return {"valid":True,"path":str(p),"size_bytes":p.stat().st_size,"file_count":len(names),"sha256":sha256_file(p),"files":names}
