from __future__ import annotations
import csv, json, os, tempfile, time, zipfile
from pathlib import Path
from engine.models import CapabilityState
from engine.data.dataset_factory import sha256_file

def run_benchmarks(workspace:str|Path,model_manager=None,rows:int=5000,include_browser:bool=True)->dict:
 root=Path(workspace); root.mkdir(parents=True,exist_ok=True); rows=max(100,min(int(rows),50000)); results=[]
 try:
  import psutil
  rss_before=int(psutil.Process().memory_info().rss)
 except ImportError: rss_before=None
 def record(name,fn,input_size=0,row_count=None):
  started=time.perf_counter()
  try:
   detail=fn() or {}; elapsed=time.perf_counter()-started
   results.append({"name":name,"state":"COMPLETED","elapsed_seconds":round(elapsed,6),"input_size_bytes":input_size,"row_count":row_count,"throughput_rows_per_second":round(row_count/elapsed,2) if row_count is not None and elapsed>0 else None,"detail":detail})
  except ImportError as exc: results.append({"name":name,"state":"DEPENDENCY_MISSING","elapsed_seconds":round(time.perf_counter()-started,6),"detail":str(exc)})
  except Exception as exc: results.append({"name":name,"state":"FAILED","elapsed_seconds":round(time.perf_counter()-started,6),"detail":f"{type(exc).__name__}: {exc}"[:500]})
 html='<!doctype html><html><head><title>benchmark</title></head><body><main>'+('<p>Representative HTML extraction content.</p>'*1000)+'</main></body></html>'
 def html_bench():
  from engine.extraction.html_extractor import extract_html
  out=extract_html(html,"https://example.invalid/fixture")
  if len(out.get("text",""))<100: raise RuntimeError("HTML fixture extraction was unexpectedly short")
  return {"characters_extracted":len(out["text"]),"engine":"BeautifulSoup"}
 record("html_parsing",html_bench,len(html.encode()),1)
 def csv_clean_bench():
  try: import polars as pl
  except ImportError as exc: raise ImportError("Polars is not installed") from exc
  from engine.data.refinery import clean_frame,deduplicate
  frame=pl.DataFrame({" Company ":[f"Company {i%max(20,rows//10)} " for i in range(rows)]," score ":[i%100 for i in range(rows)]," source_url":[f"https://example.invalid/{i}" for i in range(rows)]})
  cleaned=clean_frame(frame,normalize_headers=True); unique=deduplicate(cleaned)
  return {"rows_input":frame.height,"rows_after_exact_deduplication":unique.height,"columns":unique.columns}
 record("polars_cleaning_and_deduplication",csv_clean_bench,row_count=rows)
 def sql_bench():
  try: import polars as pl
  except ImportError as exc: raise ImportError("Polars is required to prepare the SQL fixture") from exc
  from engine.data.sql_engine import SQLEngine
  frame=pl.DataFrame({"group_id":[i%20 for i in range(rows)],"value":list(range(rows))})
  result=SQLEngine().query_frame(frame,"SELECT group_id, COUNT(*) AS n, AVG(value) AS mean_value FROM input_data GROUP BY group_id ORDER BY group_id")
  return {"result_rows":result["row_count"],"columns":result["columns"]}
 record("duckdb_analytical_query",sql_bench,row_count=rows)
 def parquet_bench():
  try: import polars as pl
  except ImportError as exc: raise ImportError("Polars is not installed") from exc
  try: import pyarrow
  except ImportError as exc: raise ImportError("PyArrow is not installed") from exc
  with tempfile.TemporaryDirectory(dir=root) as directory:
   p=Path(directory)/"bench.parquet"; frame=pl.DataFrame({"id":list(range(rows)),"name":[f"n{i%100}" for i in range(rows)]}); frame.write_parquet(p); loaded=pl.read_parquet(p)
   if loaded.height!=rows: raise RuntimeError("Parquet round-trip row count mismatch")
   return {"file_size_bytes":p.stat().st_size,"round_trip_rows":loaded.height,"sha256":sha256_file(p)}
 record("parquet_round_trip",parquet_bench,row_count=rows)
 def zip_bench():
  with tempfile.TemporaryDirectory(dir=root) as directory:
   source=Path(directory)/"data.jsonl"; source.write_text("".join(json.dumps({"id":i,"value":i%11})+"\\n" for i in range(rows)),encoding="utf-8"); bundle=Path(directory)/"bundle.zip"
   with zipfile.ZipFile(bundle,"w",zipfile.ZIP_DEFLATED) as archive: archive.write(source,source.name)
   with zipfile.ZipFile(bundle) as archive:
    bad=archive.testzip()
    if bad: raise RuntimeError(f"ZIP validation failed at {bad}")
    count=len(archive.namelist())
   return {"bundle_size_bytes":bundle.stat().st_size,"members":count,"round_trip_integrity":"PASS"}
 record("zip_generation_and_integrity",zip_bench,row_count=rows)
 def ai_bench():
  if model_manager is None or model_manager.model is None: raise ImportError("No local model is loaded; AI benchmark was not run")
  generated=model_manager.generate("Return only the word READY.",max_new_tokens=16)
  return {"generated_characters":len(generated),"model_id":model_manager.model_id,"measured_latency_seconds":model_manager.last_latency}
 record("local_model_inference",ai_bench)
 if include_browser:
  def browser_bench():
   from playwright.sync_api import sync_playwright
   with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--disable-dev-shm-usage","--no-sandbox"])
    try:
     page=browser.new_page(); page.set_content("<html><body><h1>Local fixture</h1></body></html>"); title=page.locator("h1").inner_text()
     if title!="Local fixture": raise RuntimeError("Browser fixture content mismatch")
     return {"fixture":"generated local HTML","result":title}
    finally: browser.close()
  record("playwright_browser_startup",browser_bench)
 try: import psutil; rss_after=int(psutil.Process().memory_info().rss)
 except ImportError: rss_after=None
 report={"generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"input_rows_requested":rows,"memory_rss_before_bytes":rss_before,"memory_rss_after_bytes":rss_after,"benchmarks":results,"note":"Measurements describe only this runtime and workload; do not compare incompatible runs as equivalent."}
 target=root/"diagnostics"/"benchmark_report.json"; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(report,indent=2),encoding="utf-8"); report["report_path"]=str(target)
 return report
