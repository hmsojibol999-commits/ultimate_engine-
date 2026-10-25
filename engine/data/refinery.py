from __future__ import annotations
import re, unicodedata
from urllib.parse import urlsplit,urlunsplit

def _polars():
 try: import polars as pl; return pl
 except ImportError as exc: raise RuntimeError("Polars is required for dataframe transformations; install requirements.txt") from exc

def clean_frame(frame,trim_strings:bool=True,normalize_headers:bool=False):
 pl=_polars(); out=frame.clone()
 if normalize_headers:
  names=[]; seen=set()
  for old in out.columns:
   name=re.sub(r"[^a-zA-Z0-9_]+","_",unicodedata.normalize("NFKC",old).strip()).strip("_").lower() or "column"
   base=name; i=2
   while name in seen: name=f"{base}_{i}"; i+=1
   names.append(name); seen.add(name)
  out=out.rename(dict(zip(out.columns,names)))
 if trim_strings:
  exprs=[]
  for col,dtype in zip(out.columns,out.dtypes):
   if dtype==pl.String: exprs.append(pl.col(col).str.strip_chars().alias(col))
  if exprs: out=out.with_columns(exprs)
 return out

def normalize_url(value:str)->str:
 if not value or not isinstance(value,str): return value
 text=value.strip()
 if not text: return text
 if "://" not in text: text="https://"+text
 p=urlsplit(text)
 if p.scheme.lower() not in ("http","https") or not p.hostname: return value.strip()
 host=p.hostname.lower()
 if ":" in host and not host.startswith("["): host=f"[{host}]"
 port=p.port
 netloc=host if port is None or (p.scheme.lower(),port) in (("http",80),("https",443)) else f"{host}:{port}"
 path=p.path or "/"
 return urlunsplit((p.scheme.lower(),netloc,path,p.query,""))

def deduplicate(frame,subset:list[str]|None=None):
 pl=_polars(); return frame.unique(subset=subset,keep="first",maintain_order=True)

def fuzzy_candidates(frame,column:str,threshold:float=0.9,max_pairs:int=1000)->list[dict]:
 if not 0<=threshold<=1: raise ValueError("threshold must be in [0,1]")
 if column not in frame.columns: raise KeyError(column)
 values=[str(v) for v in frame.get_column(column).to_list() if v is not None]
 try:
  from rapidfuzz import fuzz
  score=lambda a,b:fuzz.ratio(a,b)/100.0
 except ImportError:
  from difflib import SequenceMatcher
  score=lambda a,b:SequenceMatcher(None,a,b).ratio()
 result=[]
 for i,left in enumerate(values):
  for j in range(i+1,len(values)):
   if len(result)>=max_pairs: return result
   value=score(left,values[j])
   if value>=threshold: result.append({"left":left,"right":values[j],"similarity":round(value,4)})
 return result

def select_columns(frame,columns:list[str]):
 missing=set(columns)-set(frame.columns)
 if missing: raise KeyError(f"Unknown columns: {', '.join(sorted(missing))}")
 return frame.select(columns)
