import tempfile,unittest
from engine.crm.campaign import CampaignManager
class CampaignSendTests(unittest.TestCase):
 def test_duplicate_send_is_blocked(self):
  with tempfile.TemporaryDirectory() as d:
   manager=CampaignManager(d); calls=[]; provider=lambda *args:(calls.append(args) or {"accepted":True})
   item={"recipient":"a@example.com","subject":"Hello","body":"Body"}
   first=manager.send([item],provider,True,{"a@example.com"});second=manager.send([item],provider,True,{"a@example.com"})
   self.assertEqual(first["items"][0]["status"],"SENT");self.assertEqual(second["items"][0]["status"],"DUPLICATE_BLOCKED");self.assertEqual(len(calls),1)
 def test_opted_out_recipient_never_sent(self):
  with tempfile.TemporaryDirectory() as d:
   manager=CampaignManager(d);manager.suppression.add("a@example.com")
   result=manager.send([{"recipient":"a@example.com","body":"Body"}],lambda *a:{"accepted":True},True,{"a@example.com"})
   self.assertEqual(result["items"][0]["status"],"SUPPRESSED")
