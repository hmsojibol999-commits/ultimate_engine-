from __future__ import annotations
import json, os, shutil, sqlite3, tempfile, zipfile
from pathlib import Path, PurePosixPath
from .artifacts import sha256_file
EXCLUDED={".env","state.sqlite-wal","state.sqlite-shm"}
def create_checkpoint(workspace:str|Path,output:str|Path)->dict:
 root=Path(workspace).resolve(); out=Path(output).resolve(); out.parent.mkdir(parents=True,exist_ok=True)
 if out==root or root in out.parents: raise ValueError("Checkpoint ZIP must be outside the workspace")
 state_db=root/"state.sqlite"
 if state_db.is_file():
  db=sqlite3.connect(state_db,timeout=10)
  try: db.execute("PRAGMA wal_checkpoint(FULL)")
  finally: db.close()
 manifest={"format_version":1,"created_at":__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),"files":[]}
 fd,tmp=tempfile.mkstemp(prefix="checkpoint-",suffix=".zip",dir=str(out.parent)); os.close(fd)
 try:
  with zipfile.ZipFile(tmp,"w",zipfile.ZIP_DEFLATED) as zf:
   for p in sorted(root.rglob("*")):
    if p.is_symlink() or not p.is_file() or any(part in EXCLUDED or part in {".cache",".git","model_cache","playwright","__pycache__","node_modules"} for part in p.parts): continue
    if p.name.lower() in {"secrets.json","credentials.json","cookies.txt","cookies.sqlite","auth.json"} or p.name.lower().startswith(("secret_","credentials_")): continue
    if p.name.startswith(".env") and p.name!=".env.example": continue
    rel=p.relative_to(root).as_posix()
    allowed_root=PurePosixPath(rel).parts[0]
    if rel!="state.sqlite" and allowed_root not in {"artifacts","checkpoints","logs","reports","diagnostics","workflows"}: continue
    if rel==out.name: continue
    zf.write(p,rel)
    manifest["files"].append({"path":rel,"size_bytes":p.stat().st_size,"sha256":sha256_file(p)})
   zf.writestr("checkpoint_manifest.json",json.dumps(manifest,indent=2))
  with zipfile.ZipFile(tmp) as zf:
   bad=zf.testzip()
   if bad: raise RuntimeError(f"Checkpoint integrity error: {bad}")
   names=set(zf.namelist())
   if "checkpoint_manifest.json" not in names: raise RuntimeError("Checkpoint manifest is missing")
  os.replace(tmp,out)
 finally:
  if os.path.exists(tmp): os.unlink(tmp)
 return {"path":str(out),"size_bytes":out.stat().st_size,"sha256":sha256_file(out),"file_count":len(manifest["files"])}

def restore_checkpoint(bundle:str|Path,destination:str|Path,max_member_bytes:int=1_000_000_000,max_total_bytes:int=5_000_000_000)->dict:
 bundle=Path(bundle); root=Path(destination).resolve(); root.mkdir(parents=True,exist_ok=True)
 if not bundle.is_file(): raise FileNotFoundError(bundle)
 staging=Path(tempfile.mkdtemp(prefix=".checkpoint-restore-",dir=str(root.parent)))
 try:
  with zipfile.ZipFile(bundle) as zf:
   infos=zf.infolist(); names=[info.filename for info in infos]
   if len(names)!=len(set(names)): raise ValueError("Checkpoint ZIP contains duplicate paths")
   manifest_info=next((info for info in infos if info.filename=="checkpoint_manifest.json"),None)
   if manifest_info is None or manifest_info.file_size>10_000_000: raise ValueError("Missing or oversized checkpoint manifest")
   try: manifest=json.loads(zf.read("checkpoint_manifest.json"))
   except (KeyError,json.JSONDecodeError,UnicodeDecodeError) as exc: raise ValueError("Missing/invalid checkpoint manifest") from exc
   if manifest.get("format_version")!=1: raise ValueError("Unsupported checkpoint format version")
   declared=manifest.get("files",[])
   if not isinstance(declared,list) or not declared: raise ValueError("Checkpoint manifest contains no declared files")
   names=set(zf.namelist()); total=0; validated=[]
   if names != set(declared_names := [item.get("path") for item in declared if isinstance(item,dict)]) | {"checkpoint_manifest.json"}:
    raise ValueError("Checkpoint ZIP entries do not match its manifest")
   for item in declared:
    name=item.get("path")
    if not isinstance(name,str) or not name: raise ValueError("Invalid manifest file path")
    path=PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or name.startswith("/"): raise ValueError(f"Unsafe checkpoint path: {name}")
    if name=="checkpoint_manifest.json": raise ValueError("Manifest cannot list itself as a payload file")
    if name not in names: raise ValueError(f"Manifest file is missing: {name}")
    info=zf.getinfo(name)
    if info.flag_bits & 1: raise ValueError(f"Encrypted ZIP members are not supported: {name}")
    if info.file_size>max_member_bytes: raise ValueError(f"Checkpoint member exceeds size limit: {name}")
    total+=info.file_size
    if total>max_total_bytes: raise ValueError("Checkpoint exceeds total uncompressed size limit")
    target=(root/Path(*path.parts)).resolve()
    if root not in target.parents: raise ValueError(f"Unsafe restore target: {name}")
    staged=(staging/Path(*path.parts)).resolve()
    if staging.resolve() not in staged.parents: raise ValueError(f"Unsafe staging target: {name}")
    staged.parent.mkdir(parents=True,exist_ok=True); import hashlib
    digest=hashlib.sha256(); written=0
    with zf.open(name,"r") as src, staged.open("wb") as dst:
     for chunk in iter(lambda:src.read(1024*1024),b""):
      written+=len(chunk)
      if written>max_member_bytes: raise ValueError(f"Checkpoint member exceeded size limit while extracting: {name}")
      digest.update(chunk); dst.write(chunk)
    if written!=int(item.get("size_bytes",-1)): raise ValueError(f"Size mismatch: {name}")
    if digest.hexdigest()!=item.get("sha256"): raise ValueError(f"Checksum mismatch: {name}")
    validated.append((staged,target))
  # Only after every declared member passes path, size and digest checks are files installed.
  for staged,target in validated:
   target.parent.mkdir(parents=True,exist_ok=True); os.replace(staged,target)
  return {"restored_files":len(validated),"destination":str(root),"validated":True,"uncompressed_bytes":total}
 finally: shutil.rmtree(staging,ignore_errors=False)
