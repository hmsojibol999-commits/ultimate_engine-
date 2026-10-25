from __future__ import annotations
import json
from typing import Any
from engine.exceptions import ValidationError

def parse_json_object(text:str,required_keys:set[str]|None=None)->dict[str,Any]:
    start=text.find("{"); end=text.rfind("}")
    if start<0 or end<start: raise ValidationError("Model output did not contain a JSON object")
    try: value=json.loads(text[start:end+1])
    except json.JSONDecodeError as exc: raise ValidationError(f"Invalid model JSON: {exc.msg}") from exc
    if not isinstance(value,dict): raise ValidationError("Expected a JSON object")
    missing=(required_keys or set())-set(value)
    if missing: raise ValidationError(f"Model JSON missing keys: {', '.join(sorted(missing))}")
    return value
