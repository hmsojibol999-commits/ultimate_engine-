from __future__ import annotations
import ipaddress, socket, time
from urllib.parse import urlsplit, urljoin
import httpx
from curl_cffi import requests as crequests
from engine.exceptions import ValidationError

def validate_public_url(url:str)->str:
    p=urlsplit(url.strip())
    if p.scheme not in ("http","https") or not p.hostname: raise ValidationError("Only absolute http/https URLs are supported")
    if p.username or p.password: raise ValidationError("Credentials inside URLs are not allowed")
    host=p.hostname.lower().rstrip(".")
    if host in {"localhost","localhost.localdomain"} or host.endswith((".local",".internal",".localhost")): raise ValidationError("Local/internal destinations are not allowed")
    try:
        addresses=socket.getaddrinfo(host,p.port or (443 if p.scheme=="https" else 80),type=socket.SOCK_STREAM)
        for item in addresses:
            addr=ipaddress.ip_address(item[4][0].split("%",1)[0])
            if not addr.is_global: raise ValidationError(f"Destination resolves to non-public IP {addr}")
    except socket.gaierror as exc:
        raise ValidationError(f"Hostname could not be resolved; check DNS/network before fetching: {host}") from exc
    except UnicodeError as exc: raise ValidationError("Invalid hostname encoding") from exc
    return url

def retry_delay(attempt:int,retry_after:str="")->float:
    if attempt<0: raise ValueError("attempt must be non-negative")
    try: requested=float(retry_after)
    except (TypeError,ValueError): requested=float(2**min(attempt,4))
    return max(0.0,min(requested,30.0))

class HTTPWorker:
 def __init__(self,timeout:float=20,max_bytes:int=5_000_000,retries:int=2,delay:float=1.0,user_agent:str="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"):
  if timeout<=0 or max_bytes<1024: raise ValueError("Invalid timeout or response-size limit")
  self.timeout=timeout; self.max_bytes=max_bytes; self.retries=max(0,min(retries,5)); self.delay=max(0,min(delay,60)); self.user_agent=user_agent; self._last_request=0.0; self._closed=False
  self._client=crequests.Session(impersonate="chrome110")
 def close(self)->None:
  if not self._closed: self._client.close(); self._closed=True
 def __enter__(self): return self
 def __exit__(self,exc_type,exc,tb): self.close()
 def _pace(self,cancel_token=None)->None:
  if self._closed: raise RuntimeError("HTTP worker is closed")
  wait=max(0.0,self.delay-(time.monotonic()-self._last_request))
  if wait and cancel_token:
   if cancel_token.wait(wait): cancel_token.raise_if_cancelled()
  elif wait: time.sleep(wait)
  if cancel_token: cancel_token.raise_if_cancelled()
  self._last_request=time.monotonic()
 def fetch(self,url:str,cancel_token=None)->dict:
  current=validate_public_url(url); started=time.monotonic(); attempts=0; last_error=None
  for attempt in range(self.retries+1):
   if cancel_token: cancel_token.raise_if_cancelled()
   self._pace(cancel_token); attempts=attempt+1
   try:
    response = self._client.get(current, timeout=self.timeout, allow_redirects=False)
    if response.status_code in (301, 302, 303, 307, 308):
     location=response.headers.get("location")
     if not location: raise RuntimeError("Redirect response has no Location header")
     current=validate_public_url(urljoin(current,location))
     if attempt>=self.retries: raise RuntimeError("Redirect limit/retry budget reached")
     continue
    if response.status_code in (429,500,502,503,504) and attempt<self.retries:
     wait=retry_delay(attempt,response.headers.get("retry-after",""))
     if cancel_token and cancel_token.wait(wait): cancel_token.raise_if_cancelled()
     elif not cancel_token: time.sleep(wait)
     continue
    if response.status_code >= 400: raise RuntimeError(f"HTTP {response.status_code}")
    
    body = response.content
    if len(body) > self.max_bytes: raise RuntimeError(f"Response exceeded byte limit ({self.max_bytes})")
    
    content_type=response.headers.get("content-type","").split(";",1)[0].lower()
    return {"requested_url":url,"final_url":str(response.url),"status_code":response.status_code,"content_type":content_type,"body":body,"bytes":len(body),"attempts":attempts,"elapsed_seconds":round(time.monotonic()-started,4),"retrieved_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}
   except Exception as exc:
    last_error=f"{type(exc).__name__}: {exc}"
    if attempt<self.retries:
     wait=retry_delay(attempt)
     if cancel_token and cancel_token.wait(wait): cancel_token.raise_if_cancelled()
     elif not cancel_token: time.sleep(wait)
     continue
    break
  raise RuntimeError(f"HTTP request failed after {attempts} attempt(s): {last_error or 'retry budget exhausted'}")
