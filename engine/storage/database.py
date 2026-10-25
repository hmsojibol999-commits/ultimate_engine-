from __future__ import annotations
import json, sqlite3
from contextlib import contextmanager
from pathlib import Path
from engine.models import Job,JobState,utc_now
SCHEMA_VERSION=1
class StateDatabase:
 def __init__(self,path:str|Path):
  self.path=Path(path); self.path.parent.mkdir(parents=True,exist_ok=True); self._init()
 @contextmanager
 def connect(self):
  conn=sqlite3.connect(self.path,timeout=15); conn.row_factory=sqlite3.Row
  try:
   conn.execute("PRAGMA journal_mode=WAL"); conn.execute("PRAGMA foreign_keys=ON")
   yield conn
   conn.commit()
  except Exception:
   conn.rollback()
   raise
  finally:
   conn.close()
 def _init(self):
  with self.connect() as c:
   c.execute("CREATE TABLE IF NOT EXISTS schema_version(version INTEGER NOT NULL)")
   if not c.execute("SELECT 1 FROM schema_version").fetchone(): c.execute("INSERT INTO schema_version VALUES(?)",(SCHEMA_VERSION,))
   c.execute("CREATE TABLE IF NOT EXISTS jobs(job_id TEXT PRIMARY KEY,request TEXT NOT NULL,state TEXT NOT NULL,plan_json TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,error TEXT,artifacts_json TEXT NOT NULL DEFAULT '[]')")
   c.execute("CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL,event TEXT NOT NULL,details_json TEXT NOT NULL)")
   c.execute("CREATE TABLE IF NOT EXISTS artifact_records(path TEXT PRIMARY KEY,sha256 TEXT NOT NULL,size_bytes INTEGER NOT NULL,kind TEXT NOT NULL,created_at TEXT NOT NULL)")
 def save_job(self,job:Job):
  with self.connect() as c: c.execute("INSERT INTO jobs(job_id,request,state,plan_json,created_at,updated_at,error,artifacts_json) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(job_id) DO UPDATE SET state=excluded.state,plan_json=excluded.plan_json,updated_at=excluded.updated_at,error=excluded.error,artifacts_json=excluded.artifacts_json",(job.job_id,job.request,job.state.value,json.dumps(job.plan),job.created_at,job.updated_at,job.error,json.dumps(job.result_artifacts)))
 def get_job(self,job_id:str)->Job|None:
  with self.connect() as c: row=c.execute("SELECT * FROM jobs WHERE job_id=?",(job_id,)).fetchone()
  if not row:return None
  return Job(row["job_id"],row["request"],JobState(row["state"]),json.loads(row["plan_json"]),row["created_at"],row["updated_at"],row["error"],json.loads(row["artifacts_json"]))
 def list_jobs(self,limit:int=100)->list[dict]:
  with self.connect() as c: rows=c.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?",(max(1,min(limit,1000)),)).fetchall()
  return [{"job_id":r["job_id"],"request":r["request"],"state":r["state"],"created_at":r["created_at"],"updated_at":r["updated_at"],"error":r["error"],"artifacts":json.loads(r["artifacts_json"])} for r in rows]
 def audit(self,event:str,details:dict):
  with self.connect() as c: c.execute("INSERT INTO audit_events(created_at,event,details_json) VALUES(?,?,?)",(utc_now(),event,json.dumps(details,default=str)))
 def audit_log(self,limit:int=200)->list[dict]:
  with self.connect() as c: rows=c.execute("SELECT * FROM audit_events ORDER BY id DESC LIMIT ?",(max(1,min(limit,2000)),)).fetchall()
  return [{"id":r["id"],"created_at":r["created_at"],"event":r["event"],"details":json.loads(r["details_json"])} for r in rows]
