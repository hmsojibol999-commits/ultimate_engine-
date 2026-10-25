from __future__ import annotations
import json, uuid, logging
from pathlib import Path
from .models import Job,JobState,Plan,utc_now
from .state_machine import transition
from .exceptions import ValidationError,CancelledError
from .cancellation import CancellationToken
from engine.storage.database import StateDatabase
logger=logging.getLogger(__name__)
class Orchestrator:
 def __init__(self,workspace:str|Path): self.workspace=Path(workspace); self.workspace.mkdir(parents=True,exist_ok=True); self.db=StateDatabase(self.workspace/"state.sqlite"); self.tokens:dict[str,CancellationToken]={}
 def plan(self,request:str,parameters:dict|None=None)->Plan:
  request=request.strip()
  if not request or len(request)>5000: raise ValidationError("Request must contain 1–5000 characters")
  p=parameters or {}; stages=[]
  if p.get("urls") or any(x in request.lower() for x in ("collect","scrape","fetch","crawl","job listing")):
   stages.append({"id":"collect","operation":"collect_public_urls","approved":False,"limits":{"max_pages":min(int(p.get("max_pages",10)),1000),"timeout":min(float(p.get("timeout",20)),120)},"output":"raw_records.jsonl"})
  if p.get("file_path") or any(x in request.lower() for x in ("csv","dataset","dataframe","clean","analy")):
   stages.append({"id":"refine","operation":"load_and_profile_data","approved":False,"output":"data_profile.json"})
  if not stages: stages=[{"id":"inspect","operation":"inspect_request","approved":False,"output":"plan_report.json"}]
  return Plan(request,stages,p)
 def create_job(self,plan:Plan)->Job:
  jid=uuid.uuid4().hex[:12]; job=Job(jid,plan.request,JobState.CREATED,plan.to_dict()); job.state=transition(job.state,JobState.PLANNED); job.state=transition(job.state,JobState.AWAITING_APPROVAL); self.db.save_job(job); return job
 def approve(self,job_id:str,approved:bool)->Job:
  job=self.get_job(job_id)
  if job.state != JobState.AWAITING_APPROVAL: raise ValidationError("Job is not waiting for plan approval")
  if not approved: job.state=transition(job.state,JobState.CANCELLED)
  else:
   job.plan["approved"]=True
   for stage in job.plan.get("stages",[]): stage["approved"]=True
   job.state=transition(job.state,JobState.QUEUED)
  job.updated_at=utc_now(); self.db.save_job(job); return job
 def start(self,job_id:str,worker)->dict:
  job=self.get_job(job_id)
  if job.state!=JobState.QUEUED: raise ValidationError("Only approved queued jobs can start")
  job.state=transition(job.state,JobState.RUNNING); job.updated_at=utc_now(); self.db.save_job(job)
  token=CancellationToken(); self.tokens[job_id]=token
  try:
   result=worker(job,token); token.raise_if_cancelled()
   job=self.get_job(job_id); job.state=transition(job.state,JobState.AWAITING_DECISION); job.updated_at=utc_now(); self.db.save_job(job)
   return {"job":job.to_dict(),"result":result}
  except CancelledError as exc:
   job=self.get_job(job_id); job.state=transition(job.state,JobState.CANCELLED); job.error=str(exc); job.updated_at=utc_now(); self.db.save_job(job); raise
  except Exception as exc:
   job=self.get_job(job_id); job.state=transition(job.state,JobState.FAILED); job.error=f"{type(exc).__name__}: {exc}"[:2000]; job.updated_at=utc_now(); self.db.save_job(job); logger.exception("Job %s failed",job_id); raise
  finally: self.tokens.pop(job_id,None)
 def cancel(self,job_id:str)->Job:
  job=self.get_job(job_id)
  token=self.tokens.get(job_id)
  if token: token.cancel()
  if job.state in (JobState.CREATED,JobState.PLANNED,JobState.AWAITING_APPROVAL,JobState.QUEUED,JobState.PAUSED,JobState.AWAITING_DECISION):
   job.state=transition(job.state,JobState.CANCELLED); job.updated_at=utc_now(); self.db.save_job(job)
  return job
 def get_job(self,job_id:str)->Job:
  found=self.db.get_job(job_id)
  if not found: raise KeyError(f"Unknown job: {job_id}")
  return found
 def history(self)->list[dict]: return self.db.list_jobs()
