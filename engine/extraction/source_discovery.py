from __future__ import annotations
from urllib.parse import urljoin,urlsplit
from bs4 import BeautifulSoup
from .http_worker import validate_public_url

def links_from_html(html:str,base_url:str,same_domain:bool=True,max_links:int=500)->list[str]:
 host=urlsplit(base_url).hostname; out=[]; seen=set()
 for tag in BeautifulSoup(html,"html.parser").find_all("a",href=True):
  raw=tag.get("href","").strip()
  if not raw or raw.startswith(("#","mailto:","javascript:","tel:")): continue
  target=urljoin(base_url,raw).split("#",1)[0]
  try: validate_public_url(target)
  except Exception: continue
  if same_domain and urlsplit(target).hostname!=host: continue
  if target not in seen: seen.add(target); out.append(target)
  if len(out)>=max_links: break
 return out

def sitemap_locations(xml_text:str,max_urls:int=5000)->list[str]:
 soup=BeautifulSoup(xml_text,"xml"); out=[]
 for loc in soup.find_all("loc"):
  url=loc.get_text(strip=True)
  try: validate_public_url(url)
  except Exception: continue
  out.append(url)
  if len(out)>=max_urls: break
 return out
