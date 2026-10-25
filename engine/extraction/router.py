from __future__ import annotations
import time
from .http_worker import HTTPWorker
from .html_extractor import extract_html,extract_main_text
class ExtractionRouter:
 def __init__(self,timeout=20,max_bytes=5_000_000,delay=1.0): self.http=HTTPWorker(timeout,max_bytes,delay=delay)
 def close(self): self.http.close()
 def __enter__(self): return self
 def __exit__(self,exc_type,exc,tb): self.close()
 def extract(self,url:str,engine:str="auto",cancel_token=None)->dict:
  if engine not in ("auto","http","browser"): raise ValueError("engine must be auto, http, or browser")
  if engine=="browser":
   try: from .browser_worker import BrowserWorker
   except ImportError as exc: raise RuntimeError("Playwright browser capability is unavailable; install optional requirements and Chromium") from exc
   return BrowserWorker().extract(url,cancel_token=cancel_token)
  fetched=self.http.fetch(url,cancel_token=cancel_token); ctype=fetched["content_type"]
  if ctype in ("text/html","application/xhtml+xml") or "html" in ctype:
   content=fetched["body"].decode("utf-8",errors="replace"); result=extract_main_text(content,fetched["final_url"])
  elif ctype in ("application/json","text/json"):
   import json
   try: data=json.loads(fetched["body"])
   except json.JSONDecodeError as exc: raise RuntimeError(f"Invalid JSON source: {exc}") from exc
   result={"source_url":fetched["final_url"],"json":data,"text":"","extraction_method":"json"}
  elif ctype=="application/pdf":
   from .pdf_extractor import extract_pdf_bytes
   result=extract_pdf_bytes(fetched["body"],fetched["final_url"])
  else: result={"source_url":fetched["final_url"],"text":fetched["body"].decode("utf-8",errors="replace"),"extraction_method":"plain-text-or-unknown"}
  result.update({"source_domain":__import__("urllib.parse",fromlist=["urlsplit"]).urlsplit(fetched["final_url"]).hostname,"retrieved_at":fetched["retrieved_at"],"content_type":ctype,"collection_stats":{k:fetched[k] for k in ("status_code","bytes","attempts","elapsed_seconds")}})
  return result
