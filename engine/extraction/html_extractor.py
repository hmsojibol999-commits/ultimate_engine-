from __future__ import annotations
import hashlib, json
from bs4 import BeautifulSoup

def extract_html(html:str,url:str="",content_type:str="text/html")->dict:
 soup=BeautifulSoup(html,"html.parser")
 jsonld=[]
 for tag in soup.find_all("script",type="application/ld+json"):
  try: jsonld.append(json.loads(tag.string or tag.get_text()))
  except (json.JSONDecodeError,TypeError): continue
 for node in soup(["script","style","noscript","template","svg"]): node.decompose()
 title=soup.title.get_text(" ",strip=True) if soup.title else ""
 canonical=""
 tag=soup.find("link",rel=lambda value:value and "canonical" in value)
 if tag: canonical=str(tag.get("href", ""))
 metadata={}
 for tag in soup.find_all("meta"):
  key=tag.get("property") or tag.get("name") or tag.get("itemprop")
  value=tag.get("content")
  if key and value and key not in metadata: metadata[str(key)[:120]]=str(value)[:2000]
 text="\n".join(line.strip() for line in soup.get_text("\n").splitlines() if line.strip())
 return {"source_url":url,"canonical_url":canonical or url,"title":title,"text":text,"metadata":metadata,"json_ld":jsonld,"content_type":content_type,"content_hash":hashlib.sha256(html.encode("utf-8",errors="replace")).hexdigest(),"extraction_method":"beautifulsoup4"}

def extract_main_text(html:str,url:str="")->dict:
 try:
  import trafilatura
  text=trafilatura.extract(html,url=url,include_comments=False,include_tables=True) or ""
  if text.strip(): return {"source_url":url,"text":text,"extraction_method":"trafilatura"}
 except ImportError as exc:
  fallback=extract_html(html,url)
  fallback["fallback_reason"]=f"Trafilatura unavailable; BeautifulSoup fallback used ({type(exc).__name__})"
  return fallback
 return extract_html(html,url)
