from __future__ import annotations
import sqlite3
class SuppressionList:
 def __init__(self,db_path):
  self.path=str(db_path)
  with sqlite3.connect(self.path) as c: c.execute("CREATE TABLE IF NOT EXISTS suppressed(recipient TEXT PRIMARY KEY,reason TEXT NOT NULL,added_at TEXT DEFAULT CURRENT_TIMESTAMP)")
 def add(self,recipient:str,reason:str="opt-out")->None:
  addr=recipient.strip().lower()
  if not addr: raise ValueError("recipient is required")
  with sqlite3.connect(self.path) as c: c.execute("INSERT INTO suppressed(recipient,reason) VALUES(?,?) ON CONFLICT(recipient) DO UPDATE SET reason=excluded.reason",(addr,reason[:300]))
 def contains(self,recipient:str)->bool:
  with sqlite3.connect(self.path) as c: return c.execute("SELECT 1 FROM suppressed WHERE recipient=?",(recipient.strip().lower(),)).fetchone() is not None
 def list(self)->list[dict]:
  with sqlite3.connect(self.path) as c: return [{"recipient":r[0],"reason":r[1],"added_at":r[2]} for r in c.execute("SELECT recipient,reason,added_at FROM suppressed ORDER BY added_at DESC")]
