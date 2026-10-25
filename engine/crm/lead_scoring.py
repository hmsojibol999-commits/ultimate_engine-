from __future__ import annotations

def score_lead(record:dict,weights:dict[str,float]|None=None)->dict:
 weights=weights or {"relevance":0.35,"completeness":0.25,"freshness":0.2,"evidence":0.2}
 signals={"relevance":float(record.get("relevance_score",0) or 0),"completeness":sum(record.get(k) not in (None,"") for k in ("company","title","location","source_url"))/4,"freshness":float(record.get("freshness_score",0) or 0),"evidence":float(record.get("evidence_score",0) or 0)}
 if any(v<0 or v>1 for v in signals.values()): raise ValueError("Lead signals must be in [0,1]")
 if any(v<0 for v in weights.values()) or sum(weights.values())<=0: raise ValueError("Weights must be non-negative with positive sum")
 denom=sum(weights.values()); score=100*sum(signals[k]*weights.get(k,0) for k in signals)/denom
 return {"score":round(score,2),"signals":signals,"weights":weights,"interpretation":"Rule-based match score, not verified purchase intent."}
