# Architecture

- `engine/orchestrator.py` creates plans and persists strict finite-state transitions in SQLite. Plans are not executed until an explicit approval.
- `engine/extraction/` performs bounded HTTP collection and HTML/document parsing. Each record retains source URL, retrieval data, content type/method and errors where applicable. Browser support is optional.
- `engine/data/` handles Polars transformations, restricted in-memory DuckDB queries, quality checks, enrichment annotations and deterministic export packaging.
- `engine/ai/` loads a local Transformers model only on request. Deterministic intent parsing stays available without AI. Model outputs must be schema-validated before structured use.
- `engine/crm/` drafts pitches and applies explainable rule-based scoring. Campaign sending requires an explicit approval flag, a recipient allowlist, opt-out checks and duplicate-send prevention.
- `engine/storage/` stores portable SQLite state and checksummed checkpoint/artifact ZIPs. Checkpoint restore validates every path and hash before writing any file.
- `ui/` exposes seven real-action dashboard tabs. It is a local-administrator control panel, not a secured multi-tenant client portal.

Resource controls are conservative defaults rather than promises about any particular Kaggle allocation. Every session must run preflight. GPU memory is measured individually for each device; devices are not treated as pooled VRAM.
