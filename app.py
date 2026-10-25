from __future__ import annotations
import os
from pathlib import Path
from config import Config
from engine.monitoring.logging_config import configure_logging
from ui.callbacks import DashboardService
from ui.dashboard import build_dashboard

def main():
 cfg=Config.load(os.environ.get("ENGINE_CONFIG"))
 workspace=Path(cfg.workspace); workspace.mkdir(parents=True,exist_ok=True)
 configure_logging(cfg.log_level,workspace/"logs"/"engine.log")
 service=DashboardService(cfg)
 demo=build_dashboard(service,cfg)
 demo.queue(default_concurrency_limit=2,max_size=16)
 demo.launch(server_name=cfg.bind_host,server_port=cfg.bind_port,share=False,show_error=True)
if __name__=="__main__": main()
