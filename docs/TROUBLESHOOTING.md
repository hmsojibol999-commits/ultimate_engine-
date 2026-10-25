# Troubleshooting

- **Missing package:** inspect preflight; install only the missing core package or use `requirements-optional.txt` for an optional integration.
- **Playwright import works but launch fails:** install the Chromium binary with `python -m playwright install chromium`; Linux may need Playwright OS libraries. Browser extraction also needs permitted public network access.
- **HTTP 403/429:** the source may restrict automated access or rate-limit requests. Reduce request rate or use its official API/permissioned export. The engine does not bypass access controls.
- **No CUDA / insufficient VRAM:** deterministic features remain usable. Try CPU only for a small model, or use an appropriately quantized cached model. Do not assume VRAM pools across GPUs.
- **Model download error:** ensure model ID/access/network and cache space are correct; inspect detailed status. A model is never auto-downloaded at startup.
- **DuckDB rejects SQL:** use a single SELECT over the registered `input_data` table; external file functions, extension installation and multiple statements are blocked.
- **Checkpoint rejected:** regenerate from a trusted engine bundle. The restore path validates archive paths and checksums before extraction.
- **Dashboard not reachable on hosted runtime:** use the host notebook's documented port-forwarding/proxy. The default localhost bind is deliberate.
