from __future__ import annotations
import csv, hashlib, json, os, zipfile
from pathlib import Path
from datetime import datetime,timezone

def _records(frame)->list[dict]:
 if hasattr(frame,"to_dicts"): return frame.to_dicts()
 if hasattr(frame,"to_dict"): return frame.to_dict(orient="records")
 if isinstance(frame,list): return [dict(x) for x in frame]
 raise TypeError("Expected dataframe or list of records")

def export_frame(frame,out_dir:str|Path,basename:str="dataset",formats:list[str]|None=None,metadata:dict|None=None)->dict:
 out=Path(out_dir); out.mkdir(parents=True,exist_ok=True); rows=_records(frame); formats=formats or ["csv","json","jsonl"]
 if not rows: raise ValueError("Refusing to create an empty dataset export")
 if not re_safe(basename): raise ValueError("basename must contain only letters, digits, underscore or dash")
 files=[]
 for fmt in formats:
  if fmt not in ("csv","json","jsonl","parquet"): raise ValueError(f"Unsupported export format: {fmt}")
  path=out/f"{basename}.{fmt}"
  if fmt=="csv":
   columns=list(rows[0].keys())
   with path.open("w",newline="",encoding="utf-8") as f:
    writer=csv.DictWriter(f,fieldnames=columns,extrasaction="ignore"); writer.writeheader(); writer.writerows(rows)
  elif fmt=="json": path.write_text(json.dumps(rows,ensure_ascii=False,indent=2,default=str),encoding="utf-8")
  elif fmt=="jsonl": path.write_text("".join(json.dumps(r,ensure_ascii=False,default=str)+"\n" for r in rows),encoding="utf-8")
  else:
   try: import polars as pl; pl.DataFrame(rows).write_parquet(path)
   except ImportError as exc: raise RuntimeError("Parquet export requires Polars") from exc
  files.append(path)
 dictionary={"columns":[{"name":k,"description":"Not supplied; infer from source or document manually."} for k in rows[0]],"row_count":len(rows)}
 (out/f"{basename}_data_dictionary.json").write_text(json.dumps(dictionary,indent=2),encoding="utf-8"); files.append(out/f"{basename}_data_dictionary.json")
 (out/f"{basename}_quality_report.json").write_text(json.dumps({"row_count":len(rows),"column_count":len(rows[0]),"duplicate_record_count":len(rows)-len({json.dumps(r,sort_keys=True,default=str) for r in rows}),"generated_at":datetime.now(timezone.utc).isoformat()},indent=2),encoding="utf-8"); files.append(out/f"{basename}_quality_report.json")
 manifest={"generated_at":datetime.now(timezone.utc).isoformat(),"metadata":metadata or {},"files":[]}
 for path in files: manifest["files"].append({"path":path.name,"size_bytes":path.stat().st_size,"sha256":sha256_file(path)})
 manifest_path=out/f"{basename}_manifest.json"; manifest_path.write_text(json.dumps(manifest,indent=2),encoding="utf-8"); files.append(manifest_path)
 zip_path=out/f"{basename}_bundle.zip"
 with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as zf:
  for path in files: zf.write(path,path.name)
 with zipfile.ZipFile(zip_path) as zf:
  bad=zf.testzip()
  if bad: raise RuntimeError(f"ZIP validation failed at {bad}")
 return {"files":[str(p) for p in files],"bundle":str(zip_path),"row_count":len(rows),"bundle_sha256":sha256_file(zip_path)}

def sha256_file(path:str|Path)->str:
 h=hashlib.sha256()
 with Path(path).open("rb") as f:
  for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
 return h.hexdigest()
def re_safe(value:str)->bool:
 import re
 return bool(re.fullmatch(r"[A-Za-z0-9_-]{1,80}",value))
