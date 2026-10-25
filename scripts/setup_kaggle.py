from __future__ import annotations
import importlib.util, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
required={"gradio":"gradio","httpx":"httpx","bs4":"beautifulsoup4","polars":"polars","duckdb":"duckdb","pyarrow":"pyarrow","pydantic":"pydantic","trafilatura":"trafilatura"}
missing=[package for module,package in required.items() if importlib.util.find_spec(module) is None]
if not missing:
 print("All core Python packages are already installed; no package changes made.")
else:
 print("Missing core packages:",", ".join(missing))
 print("Installing only missing core packages; preinstalled torch/CUDA are not touched.")
 result=subprocess.run([sys.executable,"-m","pip","install",*missing],check=False)
 if result.returncode: raise SystemExit(f"pip install failed with exit code {result.returncode}; inspect Kaggle network and package compatibility.")
 absent=[name for mod,name in required.items() if importlib.util.find_spec(mod) is None]
 if absent: raise SystemExit("Packages still missing after install: "+", ".join(absent))
 print("Core package verification passed.")
print("Browser note: Playwright package and Chromium browser binaries are separate checks. For the optional path use `python -m pip install -r requirements-optional.txt` and `python -m playwright install chromium`; system libraries may still be required.")
