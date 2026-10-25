from __future__ import annotations
from datetime import datetime,timezone

def annotate_missing(record:dict,fields:list[str])->dict:
 result=dict(record); missing=[f for f in fields if result.get(f) in (None, "")]
 result["enrichment_status"]="NEEDS_REVIEW" if missing else "COMPLETE"
 result["missing_fields"]=missing; result["verified_at"]=datetime.now(timezone.utc).isoformat()
 result["evidence"]={"source_url":result.get("source_url"),"method":"supplied-data-check","observed_fields":[f for f in fields if result.get(f) not in (None,"")]}
 return result

def apply_field_mapping(record:dict,mapping:dict[str,str])->dict:
 mapped={}
 for target,source in mapping.items(): mapped[target]=record.get(source)
 return mapped
