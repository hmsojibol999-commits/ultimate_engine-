from __future__ import annotations
import json, time
from pathlib import Path
from engine.orchestrator import Orchestrator
from engine.extraction.router import ExtractionRouter
from engine.data.loader import load_records
from engine.data.refinery import clean_frame,deduplicate
from engine.data.quality import profile_frame
from engine.data.sql_engine import SQLEngine
from engine.data.dataset_factory import export_frame
from engine.ai.fallbacks import deterministic_intent
from engine.crm.pitch_generator import draft_pitch
from engine.crm.lead_scoring import score_lead
from engine.crm.campaign import CampaignManager
from engine.crm.smtp_adapter import SMTPAdapter
from engine.storage.checkpoint import create_checkpoint,restore_checkpoint
from engine.storage.artifacts import ArtifactManager
from engine.monitoring.diagnostics import preflight
from engine.monitoring.benchmark import run_benchmarks
from ui.components import format_result

class DashboardService:
 def __init__(self,config):
  self.config=config; self.workspace=Path(config.workspace); self.workspace.mkdir(parents=True,exist_ok=True); self.orchestrator=Orchestrator(self.workspace); self.artifacts=ArtifactManager(self.workspace); self.current_frame=None; self.current_path=None; self.current_job=None
  self.campaigns=CampaignManager(self.workspace)
  self.smtp=SMTPAdapter(config.smtp_host,config.smtp_port,config.smtp_username,config.smtp_password,config.smtp_from)
  from engine.ai.model_manager import ModelManager
  self.model=ModelManager(config.model_id,config.model_cache,config.model_max_new_tokens,config.model_context_length,config.temperature)
 def command(self,request):
  intent=deterministic_intent(request)
  plan=self.orchestrator.plan(request,{"urls":intent["urls"],"max_pages":self.config.max_pages})
  job=self.orchestrator.create_job(plan); self.current_job=job.job_id
  return format_result({"intent":intent,"plan":plan.to_dict(),"job":job.to_dict(),"approval_required":True})
 def approve_job(self,job_id,approved):
  job=self.orchestrator.approve(job_id.strip(),approved)
  if not approved:return format_result({"job":job.to_dict(),"message":"Plan rejected; no stages executed."})
  def worker(job,token):
   outputs=[]
   for stage in job.plan["stages"]:
    token.raise_if_cancelled()
    if stage["operation"]=="collect_public_urls":
     urls=job.plan.get("parameters",{}).get("urls") or __import__("re").findall(r"https?://[^\s,]+",job.request)
     results=[]; router=ExtractionRouter(self.config.http_timeout,self.config.max_response_bytes,self.config.request_delay)
     try:
      for url in urls[:self.config.max_pages]:
       token.raise_if_cancelled()
       try: results.append(router.extract(url,cancel_token=token))
       except Exception as exc: results.append({"source_url":url,"status":"FAILED","error":f"{type(exc).__name__}: {exc}"})
     finally: router.close()
     path=self.artifacts.write_json(f"jobs/{job.job_id}/raw_records.json",results); outputs.append({"artifact":str(path),"records":len(results),"successes":sum("error" not in x for x in results)})
    elif stage["operation"]=="load_and_profile_data":
     fp=job.plan.get("parameters",{}).get("file_path")
     if not fp: outputs.append({"stage":"refine","status":"NOT_CONFIGURED","detail":"Supply a file path in plan parameters."}); continue
     frame=load_records(fp,self.config.max_file_bytes); self.current_frame=frame; self.current_path=fp
     prof=profile_frame(frame); path=self.artifacts.write_json(f"jobs/{job.job_id}/data_profile.json",prof); outputs.append({"artifact":str(path),"profile":prof})
    else:
     path=self.artifacts.write_json(f"jobs/{job.job_id}/plan_report.json",{"request":job.request,"note":"This stage inspected the request only; no external operation was performed."}); outputs.append({"artifact":str(path)})
   return {"outputs":outputs,"checkpoint":"awaiting administrator decision"}
  try: result=self.orchestrator.start(job.job_id,worker)
  except Exception as exc:return format_result({"error":f"{type(exc).__name__}: {exc}","job":self.orchestrator.get_job(job.job_id).to_dict()})
  return format_result(result)
 def stop_job(self,job_id):
  try:return format_result(self.orchestrator.cancel(job_id.strip()).to_dict())
  except Exception as exc:return f"Cancel failed: {type(exc).__name__}: {exc}"
 def scrape(self,urls_text,engine,timeout,max_pages,delay):
  urls=[u.strip() for u in urls_text.splitlines() if u.strip()][:int(max_pages)]
  if not urls:return "Enter at least one URL, one URL per line.", None
  results=[]; router=ExtractionRouter(float(timeout),self.config.max_response_bytes,float(delay))
  from engine.cancellation import CancellationToken
  token=CancellationToken()
  try:
   for url in urls:
    try: results.append(router.extract(url,engine=engine,cancel_token=token))
    except Exception as exc: results.append({"source_url":url,"status":"FAILED","error":f"{type(exc).__name__}: {exc}"})
  finally: router.close()
  path=self.artifacts.write_json(f"scrape_{int(time.time())}.json",results)
  return format_result({"results":results,"artifact":str(path),"success_count":sum("error" not in r for r in results),"failure_count":sum("error" in r for r in results)}), str(path)
 def load_file(self,file_obj):
  if file_obj is None:return "Upload a CSV, JSON, JSONL, or Parquet file."
  path=getattr(file_obj,"name",str(file_obj))
  try:
   self.current_frame=load_records(path,self.config.max_file_bytes); self.current_path=path
   return format_result({"path":path,"profile":profile_frame(self.current_frame),"preview":self.current_frame.head(self.config.max_preview_rows).to_dicts() if hasattr(self.current_frame,"to_dicts") else self.current_frame[:self.config.max_preview_rows]})
  except Exception as exc:return f"Load failed: {type(exc).__name__}: {exc}"
 def clean_data(self,remove_duplicates,normalize_headers):
  if self.current_frame is None:return "Load a data file first."
  try:
   before=self.current_frame.height; frame=clean_frame(self.current_frame,normalize_headers=normalize_headers)
   if remove_duplicates: frame=deduplicate(frame)
   self.current_frame=frame; return format_result({"rows_before":before,"rows_after":frame.height,"profile":profile_frame(frame),"preview":frame.head(self.config.max_preview_rows).to_dicts()})
  except Exception as exc:return f"Clean failed: {type(exc).__name__}: {exc}"
 def run_sql(self,sql):
  if self.current_frame is None:return "Load a data file first."
  try:
   result=SQLEngine().query_frame(self.current_frame,sql)
   frame=result.pop("dataframe")
   if hasattr(frame,"to_dicts"): result["preview"]=frame.head(self.config.max_preview_rows).to_dicts()
   elif hasattr(frame,"to_dict"): result["preview"]=frame.head(self.config.max_preview_rows).to_dict(orient="records")
   else: result["preview"]=frame[:self.config.max_preview_rows]
   return format_result(result)
  except Exception as exc:return f"SQL failed: {type(exc).__name__}: {exc}"
 def export_data(self,formats):
  if self.current_frame is None:return "Load a non-empty dataset first.", None
  try:
   result=export_frame(self.current_frame,self.workspace/"artifacts"/"exports",formats=[x.strip() for x in formats.split(",") if x.strip()],metadata={"source_file":self.current_path})
   return format_result(result),result["bundle"]
  except Exception as exc:return f"Export failed: {type(exc).__name__}: {exc}",None
 def diagnostics(self):return format_result(preflight(self.workspace))
 def benchmarks(self):
  try:return format_result(run_benchmarks(self.workspace,self.model))
  except Exception as exc:return f"Benchmark suite failed: {type(exc).__name__}: {exc}"
 def model_load(self,allow_download):
  try:return format_result(self.model.load(allow_download=allow_download))
  except Exception as exc:return format_result({"status":self.model.status,"error":f"{type(exc).__name__}: {exc}","fallback":"Deterministic tools remain available."})
 def model_unload(self):
  try:return format_result(self.model.unload())
  except Exception as exc:return f"Unload failed: {type(exc).__name__}: {exc}"
 def model_generate(self,prompt):
  try:return self.model.generate(prompt)
  except Exception as exc:return f"Generation unavailable: {type(exc).__name__}: {exc}. Use deterministic mode or load a model."
 def pitch(self,record_json,service,criteria):
  try:
   record=json.loads(record_json)
   if not isinstance(record,dict):raise ValueError("Record must be a JSON object")
   pitch=draft_pitch(record,service,criteria); pitch["lead_score"]=score_lead(record); return format_result(pitch)
  except Exception as exc:return f"Draft failed: {type(exc).__name__}: {exc}"
 def make_checkpoint(self):
  try:
   result=create_checkpoint(self.workspace,self.workspace.parent/"download_bundle.zip")
   return format_result(result),result["path"]
  except Exception as exc:return f"Checkpoint failed: {type(exc).__name__}: {exc}",None
 def campaign_status(self):
  return format_result({"smtp_configured":self.smtp.configured(),"telegram_configured":bool(self.config.telegram_bot_token),"mode":"DRY_RUN_BY_DEFAULT","note":"Credentials are not displayed. Actual SMTP sends require a confirmation checkbox and explicit recipient allowlist."})
 def campaign_dry_run(self,items_json):
  try:
   items=json.loads(items_json)
   if not isinstance(items,list) or any(not isinstance(x,dict) for x in items): raise ValueError("Campaign input must be a JSON array of objects")
   return format_result(self.campaigns.dry_run(items))
  except Exception as exc:return f"Dry-run rejected: {type(exc).__name__}: {exc}"
 def campaign_send(self,items_json,confirmed,allowlist_text):
  try:
   if not confirmed: raise PermissionError("Check the explicit approval box before sending")
   if not self.smtp.configured(): raise RuntimeError("SMTP is not configured; set SMTP_HOST, SMTP_PORT, SMTP_FROM and credentials if required")
   items=json.loads(items_json)
   if not isinstance(items,list) or any(not isinstance(x,dict) for x in items): raise ValueError("Campaign input must be a JSON array of objects")
   allowlist={x.strip().lower() for x in allowlist_text.splitlines() if x.strip()}
   if not allowlist: raise ValueError("Enter the exact approved recipient email addresses, one per line")
   return format_result(self.campaigns.send(items,self.smtp.send,True,allowlist,provider_name="smtp",rate_per_second=0.5))
  except Exception as exc:return f"Send blocked/failed: {type(exc).__name__}: {exc}"
 def add_suppression(self,recipient,reason):
  try:
   self.campaigns.suppression.add(recipient,reason or "administrator opt-out")
   return format_result(self.campaigns.suppression.list())
  except Exception as exc:return f"Suppression update failed: {type(exc).__name__}: {exc}"
 def suppression_list(self):return format_result(self.campaigns.suppression.list())
 def campaign_history(self):return format_result(self.campaigns.history())
 def restore(self,file_obj):
  if file_obj is None:return "Upload a checkpoint ZIP first."
  try:return format_result(restore_checkpoint(getattr(file_obj,"name",str(file_obj)),self.workspace))
  except Exception as exc:return f"Restore rejected: {type(exc).__name__}: {exc}"
 def artifacts_list(self):return format_result(self.artifacts.list())
 def audit(self):return format_result(self.orchestrator.db.audit_log())
