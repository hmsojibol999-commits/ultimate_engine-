from __future__ import annotations
import httpx
class TelegramAdapter:
 def __init__(self,bot_token:str,timeout:float=15): self.bot_token=bot_token; self.timeout=timeout
 def configured(self)->bool: return bool(self.bot_token)
 def send_message(self,chat_id:str|int,text:str)->dict:
  if not self.bot_token: raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
  url=f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
  response=httpx.post(url,json={"chat_id":chat_id,"text":text},timeout=self.timeout)
  if response.status_code>=400: raise RuntimeError(f"Telegram API HTTP {response.status_code}: {response.text[:300]}")
  data=response.json()
  if not data.get("ok"): raise RuntimeError(f"Telegram API rejected message: {str(data)[:300]}")
  return {"provider":"telegram","message_id":data["result"]["message_id"]}
