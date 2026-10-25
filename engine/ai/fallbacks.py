from __future__ import annotations
import re

def deterministic_intent(request:str)->dict:
    text=request.strip(); urls=re.findall(r"https?://[^\s,]+",text)
    op="analyze" if any(w in text.lower() for w in ("analy","sql","statistics")) else "collect" if urls or any(w in text.lower() for w in ("scrape","collect","crawl")) else "inspect"
    return {"operation":op,"request":text,"urls":urls,"ai_used":False,"reason":"Deterministic parser used because no AI model is required or available."}
