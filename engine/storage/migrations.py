from __future__ import annotations
from .database import SCHEMA_VERSION

def current_schema_version(db)->int:
 with db.connect() as c: row=c.execute("SELECT version FROM schema_version LIMIT 1").fetchone()
 return int(row[0]) if row else 0

def validate_schema_version(db)->dict:
 version=current_schema_version(db)
 if version>SCHEMA_VERSION: return {"valid":False,"version":version,"supported":SCHEMA_VERSION,"reason":"Database was created by a newer engine"}
 if version<1: return {"valid":False,"version":version,"supported":SCHEMA_VERSION,"reason":"Unknown/uninitialized schema"}
 return {"valid":True,"version":version,"supported":SCHEMA_VERSION,"reason":"Schema supported"}
