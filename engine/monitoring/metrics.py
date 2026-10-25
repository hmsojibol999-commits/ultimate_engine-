from __future__ import annotations
import threading,time
class Metrics:
 def __init__(self): self._lock=threading.Lock(); self._values={}
 def observe(self,name:str,value:float,unit:str="seconds",labels:dict|None=None):
  entry={"value":float(value),"unit":unit,"timestamp":time.time(),"labels":labels or {}}
  with self._lock: self._values.setdefault(name,[]).append(entry); self._values[name]=self._values[name][-500:]
 def snapshot(self)->dict:
  with self._lock: return {k:list(v) for k,v in self._values.items()}
