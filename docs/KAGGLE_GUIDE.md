# Kaggle guide

1. Upload `builder.py` to a notebook or run the builder in a writable working directory.
2. Run `python builder.py`, then change to `Ultimate_Engine/`.
3. Run `python scripts/preflight.py` and inspect RAM, disk, per-GPU memory and missing dependencies.
4. Run `python scripts/setup_kaggle.py` to install missing core packages only. If installation changes a package set unexpectedly, stop and review the environment rather than blindly reinstalling PyTorch/CUDA.
5. Run `python app.py`. The app is on-demand; no background keep-alive is used.
6. Load a local model only after checking GPU/CPU memory, cache and package compatibility. `Load selected model` defaults to cache-only. Enable explicit download only when intended.
7. Create and download a checkpoint/export before the session expires. A notebook filesystem is not guaranteed to persist.

Kaggle quotas, RAM, GPU visibility, network and disk limits vary. T4 x2 is not guaranteed; CUDA devices have separate memory pools. Optional browsers may need system dependencies that pip cannot install.
