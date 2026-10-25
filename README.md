# Ultimate Engine

A local-admin, human-controlled data intelligence and workflow automation workbench designed for bounded Kaggle sessions and ordinary Python environments. Deterministic functionality (HTTP fetches, parsing, dataframe cleaning, SQL, provenance, exports, checkpoints and dry-run CRM) works independently of a loaded model. Optional integrations are probed and report their real availability.

## Quick start — Kaggle

```python
%cd /kaggle/working
!python builder.py  # if this builder is uploaded here; otherwise run it from its saved location
%cd /kaggle/working/Ultimate_Engine
!python scripts/preflight.py
!python scripts/setup_kaggle.py
!python app.py
```

Kaggle may require enabling Internet in notebook settings for package installation, model downloads, or public-source collection. Availability and resource quotas vary by session. Download the generated `download_bundle.zip`/checkpoint from the dashboard or copy it to `/kaggle/working` before ending the session. No process attempts to circumvent session limits.

## Local install

```bash
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\\Scripts\\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python scripts/preflight.py
python app.py
```

Dashboard default is local-only at `127.0.0.1:7860`. Do not expose it publicly without an authenticated reverse proxy and a reviewed deployment boundary. On a hosted notebook, use the notebook's supported port/proxy mechanism rather than changing the bind address blindly.

## Optional capabilities

```bash
python -m pip install -r requirements-optional.txt
python -m playwright install chromium
```

Playwright also needs browser OS dependencies on many Linux systems; `pip install playwright` alone is not proof the browser can launch. OCR requires a system `tesseract` binary in addition to Python bindings. AI model loading is explicit, consumes substantial RAM/VRAM/disk, and may require network access and a compatible quantization backend. The default candidate is `Qwen/Qwen2.5-7B-Instruct`; weights are never bundled in the ZIP. Start with a cached/accessible model and inspect per-device VRAM first. Two GPU memories are not treated as one contiguous space.

## Run tests

```bash
python scripts/run_tests.py
# or: python -m unittest discover -s tests -v
```

Core tests use local fixtures; live URLs, browser binaries, GPU, and credentials are not required. The test report marks optional checks as skipped/not run rather than claiming success.

## Workflow

1. Describe a task and inspect its deterministic plan.
2. Edit parameters and explicitly approve the plan.
3. Execute a bounded stage. Each job stops at a decision checkpoint.
4. Preview, clean, run SQL, classify only when a model is available, enrich from permitted sources, and build an export bundle as separate actions.
5. Inspect artifacts, then export a checkpoint bundle before the session ends.

Extraction only targets URLs the administrator supplies or permitted public sources. The engine validates URLs, imposes size/time/depth/domain budgets, and does not bypass authentication, CAPTCHA, or provider controls. Outreach defaults to dry-run and requires explicit campaign approval to send.

## Storage

Runtime files live under `workspace/` by default (`state.sqlite`, `artifacts/`, `checkpoints/`, and `logs/`). Use `ENGINE_WORKSPACE` to choose another writable directory. Download bundles exclude credentials, model weights, browser profiles, caches, and unrelated uploads. Back up downloaded bundles; notebook storage is ephemeral.

## Capability states

The registry reports `AVAILABLE`, `AVAILABLE_WITH_LIMITATIONS`, `DISABLED`, `DEPENDENCY_MISSING`, `RESOURCE_INSUFFICIENT`, `NOT_CONFIGURED`, `FAILED`, `COMPLETED`, or `CANCELLED`. A missing optional component never means that work completed.
