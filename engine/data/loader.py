from __future__ import annotations
import json
from pathlib import Path

def load_records(path:str|Path,max_bytes:int=25_000_000):
 p=Path(path)
 if not p.is_file(): raise FileNotFoundError(p)
 if p.stat().st_size>max_bytes: raise ValueError(f"File exceeds {max_bytes} byte limit")
 ext=p.suffix.lower()
 if ext==".csv":
  try: import polars as pl; return pl.read_csv(p,infer_schema_length=1000,raise_if_empty=False)
  except ImportError:
   import csv
   with p.open(newline="",encoding="utf-8-sig") as f: return list(csv.DictReader(f))
 if ext in (".jsonl",".ndjson"):
  rows=[]
  for line_no,line in enumerate(p.read_text(encoding="utf-8").splitlines(),1):
   if line.strip():
    try: rows.append(json.loads(line))
    except json.JSONDecodeError as exc: raise ValueError(f"Invalid JSONL at line {line_no}: {exc.msg}") from exc
  return _to_frame(rows)
 if ext==".json":
  value=json.loads(p.read_text(encoding="utf-8"))
  if isinstance(value,dict): value=value.get("records",[value])
  if not isinstance(value,list): raise ValueError("JSON root must be an array or object")
  return _to_frame(value)
 if ext==".parquet":
  import polars as pl; return pl.read_parquet(p)
 raise ValueError(f"Unsupported data format: {ext}")
def _to_frame(rows):
 try:
  import polars as pl
  return pl.DataFrame(rows, infer_schema_length=1000) if rows else pl.DataFrame()
 except ImportError: return rows
