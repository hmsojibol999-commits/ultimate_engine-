from __future__ import annotations

def build_dashboard(service,config):
 try: import gradio as gr
 except ImportError as exc: raise RuntimeError("Install core dependencies: python -m pip install -r requirements.txt") from exc
 from ui.styles import CSS
 with gr.Blocks(title="Ultimate Engine | Data Intelligence",theme=gr.themes.Soft(primary_hue="blue",neutral_hue="slate"),css=CSS) as demo:
  gr.Markdown("# ◈ Ultimate Engine\nHuman-controlled data intelligence · bounded execution · provenance-first outputs")
  with gr.Tabs():
   with gr.Tab("Command Center"):
    gr.Markdown("### Plan first, approve before execution")
    task=gr.Textbox(label="Task request",lines=3,placeholder="Collect public Python job listings from these URLs…")
    plan_btn=gr.Button("Generate plan",variant="primary"); plan_out=gr.Code(label="Plan and job ID",language="json")
    with gr.Row(): approve_id=gr.Textbox(label="Job ID to approve"); approve_yes=gr.Checkbox(label="Approve all listed stages",value=False)
    approve_btn=gr.Button("Approve / execute one bounded stage",variant="primary"); approve_out=gr.Code(label="Execution result",language="json")
    stop_id=gr.Textbox(label="Job ID to cancel"); stop_btn=gr.Button("Emergency stop / cancel",variant="stop"); stop_out=gr.Code(label="Cancellation result",language="json")
    model_prompt=gr.Textbox(label="Local model prompt",lines=3); gen_btn=gr.Button("Generate with loaded model"); gen_out=gr.Textbox(label="Model output",lines=6)
    with gr.Row(): load_model=gr.Button("Load selected model"); allow_download=gr.Checkbox(label="Allow explicit model download",value=False); unload_model=gr.Button("Unload model")
    model_status=gr.Code(label="Model status",language="json")
    plan_btn.click(service.command,task,plan_out); approve_btn.click(service.approve_job,[approve_id,approve_yes],approve_out); stop_btn.click(service.stop_job,stop_id,stop_out); gen_btn.click(service.model_generate,model_prompt,gen_out); load_model.click(service.model_load,allow_download,model_status); unload_model.click(service.model_unload,None,model_status)
   with gr.Tab("Scraper Control"):
    urls=gr.Textbox(label="Public source URLs (one per line)",lines=5); engine=gr.Dropdown(["auto","http","browser"],value="auto",label="Extraction engine"); timeout=gr.Slider(2,120,value=config.http_timeout,step=1,label="Per-request timeout (seconds)"); pages=gr.Slider(1,100,value=min(config.max_pages,100),step=1,label="Maximum URLs"); delay=gr.Slider(0,10,value=config.request_delay,step=0.5,label="Delay between requests")
    scrape_btn=gr.Button("Collect sources",variant="primary"); scrape_out=gr.Code(label="Extraction result / errors",language="json"); scrape_file=gr.File(label="Download raw extraction result"); scrape_btn.click(service.scrape,[urls,engine,timeout,pages,delay],[scrape_out,scrape_file])
   with gr.Tab("Data Refinery"):
    upload=gr.File(label="CSV / JSON / JSONL / Parquet",file_types=[".csv",".json",".jsonl",".ndjson",".parquet"]); load_btn=gr.Button("Load and profile",variant="primary"); load_out=gr.Code(label="Schema, quality, preview",language="json"); load_btn.click(service.load_file,upload,load_out)
    with gr.Row(): dedup=gr.Checkbox(label="Remove exact duplicate rows",value=True); headers=gr.Checkbox(label="Normalize column names",value=False); clean_btn=gr.Button("Clean / normalize")
    clean_out=gr.Code(label="Before / after report",language="json"); clean_btn.click(service.clean_data,[dedup,headers],clean_out)
    sql=gr.Code(label="Read-only analytical SQL against input_data",language="sql",value="SELECT * FROM input_data LIMIT 20"); sql_btn=gr.Button("Validate and execute SQL"); sql_out=gr.Code(label="SQL output",language="json"); sql_btn.click(service.run_sql,sql,sql_out)
   with gr.Tab("AI Intelligence & CRM"):
    record=gr.Code(label="One record as JSON",language="json",value='{"company":"Example Co","title":"Python Engineer","source_url":"https://example.org/jobs/1"}'); service_desc=gr.Textbox(label="Your service description",lines=3); criteria=gr.Textbox(label="Ideal customer criteria",lines=2); pitch_btn=gr.Button("Draft pitch (not sent)",variant="primary"); pitch_out=gr.Code(label="Draft, evidence and rule-based score",language="json"); pitch_btn.click(service.pitch,[record,service_desc,criteria],pitch_out)
    status_btn=gr.Button("Check provider configuration"); status_out=gr.Code(label="Provider status (no secrets shown)",language="json"); status_btn.click(service.campaign_status,None,status_out)
    campaign_items=gr.Code(label="Campaign items JSON array",language="json",value='[{"recipient":"recipient@example.com","subject":"A service idea","body":"Manually reviewed message body"}]')
    dry_btn=gr.Button("Preview campaign (dry run)"); dry_out=gr.Code(label="Eligible, invalid, duplicate or suppressed recipients",language="json"); dry_btn.click(service.campaign_dry_run,campaign_items,dry_out)
    allowlist=gr.Textbox(label="Approved recipient allowlist (exact emails, one per line)",lines=3); confirm_send=gr.Checkbox(label="I explicitly approve sending these messages now",value=False); send_btn=gr.Button("Execute approved SMTP campaign",variant="stop"); send_out=gr.Code(label="Delivery statuses",language="json"); send_btn.click(service.campaign_send,[campaign_items,confirm_send,allowlist],send_out)
    with gr.Row(): suppress_email=gr.Textbox(label="Opt-out / suppression email"); suppress_reason=gr.Textbox(label="Reason",value="opt-out"); suppress_btn=gr.Button("Add suppression")
    suppress_out=gr.Code(label="Suppression list",language="json"); suppress_btn.click(service.add_suppression,[suppress_email,suppress_reason],suppress_out)
    with gr.Row(): list_suppress_btn=gr.Button("Refresh suppression list"); history_btn=gr.Button("Refresh send history")
    list_suppress_btn.click(service.suppression_list,None,suppress_out); history_out=gr.Code(label="Campaign audit history",language="json"); history_btn.click(service.campaign_history,None,history_out)
   with gr.Tab("Export & Download"):
    formats=gr.Textbox(label="Formats, comma separated",value="csv,json,jsonl"); export_btn=gr.Button("Export current dataset",variant="primary"); export_out=gr.Code(label="Export manifest and ZIP",language="json"); export_file=gr.File(label="Download dataset ZIP"); export_btn.click(service.export_data,formats,[export_out,export_file])
    checkpoint_btn=gr.Button("Create checkpoint download_bundle.zip"); checkpoint_out=gr.Code(label="Checkpoint verification",language="json"); checkpoint_file=gr.File(label="Download checkpoint bundle"); checkpoint_btn.click(service.make_checkpoint,None,[checkpoint_out,checkpoint_file])
    checkpoint_upload=gr.File(label="Upload checkpoint ZIP"); restore_btn=gr.Button("Validate and restore checkpoint"); restore_out=gr.Code(label="Restore result",language="json"); restore_btn.click(service.restore,checkpoint_upload,restore_out)
    artifacts_btn=gr.Button("List artifacts"); artifacts_out=gr.Code(label="Artifact manifest",language="json"); artifacts_btn.click(service.artifacts_list,None,artifacts_out)
   with gr.Tab("Engine Lab"):
    diag_btn=gr.Button("Run runtime diagnostics",variant="primary"); diag_out=gr.Code(label="Resources / dependencies / GPU per device",language="json"); diag_btn.click(service.diagnostics,None,diag_out)
    bench_btn=gr.Button("Run bounded local benchmark suite"); bench_out=gr.Code(label="Runtime, throughput, optional-dependency and error report",language="json"); bench_btn.click(service.benchmarks,None,bench_out)
    gr.Markdown("Benchmarks use generated local fixtures and report missing optional capabilities instead of inventing results. Compare only runs with equivalent hardware and input sizes.")
   with gr.Tab("Operations & Security"):
    audit_btn=gr.Button("Show audit log"); audit_out=gr.Code(label="Audit events",language="json"); audit_btn.click(service.audit,None,audit_out)
    gr.Markdown("Local administrator mode. The default server binds to 127.0.0.1. Secrets are loaded from environment variables and are never intended for manifests or ZIP files. Review `workspace/` before sharing data.")
 return demo
