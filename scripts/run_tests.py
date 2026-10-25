from __future__ import annotations
import subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
raise SystemExit(subprocess.call([sys.executable,"-m","unittest","discover","-s",str(ROOT/"tests"),"-v"],cwd=ROOT))
