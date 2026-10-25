from __future__ import annotations
import hashlib, json, sqlite3, time, re
from pathlib import Path
from .suppression import SuppressionList
class CampaignManager:
 def __init__(self,workspace:str|Path):
  self.workspace=Path(workspace); self.workspace.mkdir(parents=True,exist_ok=True); self.db_path=self.workspace/"state.sqlite"; self.suppression=SuppressionList(self.db_path)
  with sqlite3.connect(self.db_path) as c:
   c.execute("CREATE TABLE IF NOT EXISTS sends(idempotency_key TEXT PRIMARY KEY,recipient TEXT NOT NULL,status TEXT NOT NULL,provider TEXT NOT NULL,detail TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
 def dry_run(self,items:list[dict])->dict:
  checks=[]
  for item in items:
   recipient=str(item.get("recipient","")).strip().lower(); valid=bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+",recipient))
   checks.append({"recipient":recipient,"valid_recipient":valid,"suppressed":self.suppression.contains(recipient) if recipient else False,"would_send":valid and not self.suppression.contains(recipient) and bool(item.get("body")),"status":"DRY_RUN"})
  return {"mode":"DRY_RUN","count":len(checks),"eligible":sum(x["would_send"] for x in checks),"items":checks}
 def send(self,items:list[dict],provider,approved:bool,recipient_allowlist:set[str],provider_name:str="provider",rate_per_second:float=1.0)->dict:
  if not approved: raise PermissionError("Explicit administrator approval is required")
  if rate_per_second<=0 or rate_per_second>10: raise ValueError("rate_per_second must be in (0, 10]")
  sent=[]
  for item in items:
   recipient=str(item.get("recipient","")).strip().lower()
   if recipient not in {x.strip().lower() for x in recipient_allowlist}: sent.append({"recipient":recipient,"status":"BLOCKED_POLICY"}); continue
   if self.suppression.contains(recipient): sent.append({"recipient":recipient,"status":"SUPPRESSED"}); continue
   if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+",recipient) or not item.get("body"): sent.append({"recipient":recipient,"status":"INVALID"}); continue
   key=hashlib.sha256((recipient+"\0"+str(item.get("subject",""))+"\0"+str(item["body"])).encode()).hexdigest()
   with sqlite3.connect(self.db_path) as c:
    if c.execute("SELECT 1 FROM sends WHERE idempotency_key=?",(key,)).fetchone(): sent.append({"recipient":recipient,"status":"DUPLICATE_BLOCKED"}); continue
    c.execute("INSERT INTO sends(idempotency_key,recipient,status,provider,detail) VALUES(?,?,?,?,?)",(key,recipient,"PENDING",provider_name,""))
   try:
    response=provider(recipient,item.get("subject",""),item["body"])
    detail=json.dumps(response,default=str)[:1000]
    with sqlite3.connect(self.db_path) as c: c.execute("UPDATE sends SET status='SENT',detail=? WHERE idempotency_key=?",(detail,key))
    sent.append({"recipient":recipient,"status":"SENT","provider_response":response})
   except Exception as exc:
    with sqlite3.connect(self.db_path) as c: c.execute("UPDATE sends SET status='FAILED',detail=? WHERE idempotency_key=?",(f"{type(exc).__name__}: {exc}"[:500],key))
    sent.append({"recipient":recipient,"status":"FAILED","error":f"{type(exc).__name__}: {exc}"})
   time.sleep(1.0/rate_per_second)
  return {"mode":"EXECUTE","items":sent,"sent":sum(x["status"]=="SENT" for x in sent)}
 def history(self)->list[dict]:
  with sqlite3.connect(self.db_path) as c:
   c.row_factory=sqlite3.Row; return [dict(r) for r in c.execute("SELECT * FROM sends ORDER BY created_at DESC")]
