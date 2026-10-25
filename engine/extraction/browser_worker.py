from __future__ import annotations
from .http_worker import validate_public_url
from .html_extractor import extract_main_text
class BrowserWorker:
 def __init__(self,timeout_ms:int=20000,max_html_bytes:int=5_000_000): self.timeout_ms=timeout_ms; self.max_html_bytes=max_html_bytes
 def extract(self,url:str,cancel_token=None)->dict:
  validate_public_url(url)
  try: from playwright.sync_api import sync_playwright
  except ImportError as exc: raise RuntimeError("Playwright package missing") from exc
  if cancel_token: cancel_token.raise_if_cancelled()
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,args=["--disable-dev-shm-usage","--no-sandbox"])
   try:
    context=browser.new_context(java_script_enabled=True); page=context.new_page(); page.set_default_navigation_timeout(self.timeout_ms); page.set_default_timeout(self.timeout_ms)
    response=page.goto(url,wait_until="domcontentloaded")
    if cancel_token: cancel_token.raise_if_cancelled()
    html=page.content()
    if len(html.encode("utf-8"))>self.max_html_bytes: raise RuntimeError("Rendered HTML exceeds configured size limit")
    result=extract_main_text(html,page.url); result.update({"status_code":response.status if response else None,"extraction_method":"playwright+"+result.get("extraction_method","html"),"browser_title":page.title()})
    context.close(); return result
   finally: browser.close()
