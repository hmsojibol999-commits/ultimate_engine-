from __future__ import annotations
from concurrent.futures import Future, ThreadPoolExecutor
import threading
from typing import Callable, TypeVar
T=TypeVar("T")
class BoundedScheduler:
 def __init__(self,workers:int=2,queue_limit:int=8):
  if workers<1 or queue_limit<0: raise ValueError("Invalid scheduler limits")
  self._pool=ThreadPoolExecutor(max_workers=workers,thread_name_prefix="engine-worker"); self._slots=threading.BoundedSemaphore(workers+queue_limit); self._lock=threading.Lock(); self._futures:set[Future]=set(); self._closed=False
 def submit(self,fn:Callable[...,T],*args,**kwargs)->Future[T]:
  if self._closed: raise RuntimeError("Scheduler is shut down")
  if not self._slots.acquire(blocking=False): raise RuntimeError("Worker queue is full")
  try: future=self._pool.submit(fn,*args,**kwargs)
  except BaseException: self._slots.release(); raise
  with self._lock: self._futures.add(future)
  def finish(f:Future)->None:
   with self._lock: self._futures.discard(f)
   self._slots.release()
  future.add_done_callback(finish); return future
 def cancel_queued(self)->int:
  with self._lock: items=list(self._futures)
  return sum(1 for f in items if f.cancel())
 def shutdown(self,wait:bool=True)->None:
  self._closed=True; self.cancel_queued(); self._pool.shutdown(wait=wait,cancel_futures=True)
