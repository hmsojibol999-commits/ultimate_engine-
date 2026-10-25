from __future__ import annotations
import logging, re
_SECRET=re.compile(r"(?i)(api[_-]?key|token|password|secret)(\s*[=:]\s*)([^\s,;]+)")
class SecretMaskFilter(logging.Filter):
 def filter(self,record):
  record.msg=_SECRET.sub(r"\1\2[REDACTED]",str(record.msg))
  if record.args:
   record.args=tuple(_SECRET.sub(r"\1\2[REDACTED]",str(x)) for x in record.args) if isinstance(record.args,tuple) else _SECRET.sub(r"\1\2[REDACTED]",str(record.args))
  return True
def configure_logging(level:str="INFO",log_file=None):
  handlers=[logging.StreamHandler()]
  if log_file:
   from pathlib import Path
   p=Path(log_file);p.parent.mkdir(parents=True,exist_ok=True);handlers.append(logging.FileHandler(p,encoding="utf-8"))
  logging.basicConfig(level=getattr(logging,level.upper(),logging.INFO),format="%(asctime)s %(levelname)s %(name)s: %(message)s",handlers=handlers,force=True)
  for handler in logging.getLogger().handlers: handler.addFilter(SecretMaskFilter())
