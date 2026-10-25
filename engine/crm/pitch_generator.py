from __future__ import annotations

def draft_pitch(record:dict,service_description:str,criteria:str="")->dict:
 service=service_description.strip()
 if not service: raise ValueError("Provide a service description first")
 company=str(record.get("company") or record.get("company_name") or "your team").strip()
 evidence=[]
 for key in ("title","industry","public_business_description","technology_keywords","source_url"):
  value=record.get(key)
  if value not in (None,""): evidence.append({"field":key,"value":value})
 subject=f"A possible fit for {company}"
 details="; ".join(f"{e['field']}: {str(e['value'])[:180]}" for e in evidence[:3]) or "the supplied public record"
 body=(f"Hello {company} team,\n\nI’m reaching out about {service}. "
       f"I found the following context in the supplied record: {details}. "
       f"{('Our target criteria are: '+criteria.strip()+'. ') if criteria.strip() else ''}"
       "If this is relevant, would a brief conversation be useful? If not, please let me know and I will not follow up.\n\nRegards")
 return {"subject":subject,"body":body,"evidence":evidence,"status":"DRAFT_NEEDS_HUMAN_REVIEW","ai_used":False}
