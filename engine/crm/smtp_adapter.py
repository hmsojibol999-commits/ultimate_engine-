from __future__ import annotations
import smtplib, ssl
from email.message import EmailMessage
class SMTPAdapter:
 def __init__(self,host:str,port:int,username:str,password:str,sender:str,timeout:float=20): self.host=host; self.port=port; self.username=username; self.password=password; self.sender=sender; self.timeout=timeout
 def configured(self)->bool: return bool(self.host and self.port and self.sender)
 def send(self,recipient:str,subject:str,body:str)->dict:
  if not self.configured(): raise RuntimeError("SMTP host/port/from are not configured")
  message=EmailMessage(); message["From"]=self.sender; message["To"]=recipient; message["Subject"]=subject; message.set_content(body)
  context=ssl.create_default_context()
  with smtplib.SMTP(self.host,self.port,timeout=self.timeout) as server:
   server.ehlo(); server.starttls(context=context); server.ehlo()
   if self.username: server.login(self.username,self.password)
   refused=server.send_message(message)
  if refused: raise RuntimeError(f"SMTP refused recipient: {recipient}")
  return {"provider":"smtp","accepted":True}
