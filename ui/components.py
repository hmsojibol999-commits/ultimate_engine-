from __future__ import annotations

def format_result(value)->str:
 import json
 return json.dumps(value,ensure_ascii=False,indent=2,default=str)[:30000]
