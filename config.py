from __future__ import annotations
import json, os
from dataclasses import asdict, dataclass, fields
from pathlib import Path
from typing import Any

@dataclass
class Config:
    workspace: str = "./workspace"
    log_level: str = "INFO"
    http_timeout: float = 20.0
    max_response_bytes: int = 5_000_000
    max_pages: int = 50
    max_records: int = 1000
    http_concurrency: int = 3
    request_delay: float = 1.0
    max_crawl_depth: int = 2
    max_file_bytes: int = 25_000_000
    max_preview_rows: int = 100
    model_id: str = "Qwen/Qwen2.5-7B-Instruct"
    model_cache: str = "./model_cache"
    model_max_new_tokens: int = 512
    model_context_length: int = 4096
    temperature: float = 0.2
    allow_remote_model: bool = False
    remote_base_url: str = ""
    remote_api_key: str = ""
    remote_model: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    telegram_bot_token: str = ""
    bind_host: str = "127.0.0.1"
    bind_port: int = 7860
    allow_public_bind: bool = False

    @classmethod
    def load(cls, path: str | Path | None = None) -> "Config":
        values: dict[str, Any] = {}
        if path and Path(path).is_file():
            loaded = json.loads(Path(path).read_text(encoding="utf-8"))
            if not isinstance(loaded, dict):
                raise ValueError("Configuration JSON must be an object")
            known = {f.name for f in fields(cls)}
            unknown = set(loaded) - known
            if unknown:
                raise ValueError(f"Unknown configuration keys: {', '.join(sorted(unknown))}")
            values.update(loaded)
        env_map = {
            "ENGINE_WORKSPACE":"workspace", "ENGINE_LOG_LEVEL":"log_level",
            "ENGINE_HTTP_TIMEOUT":"http_timeout", "ENGINE_MAX_RESPONSE_BYTES":"max_response_bytes",
            "ENGINE_MAX_PAGES":"max_pages", "ENGINE_MAX_RECORDS":"max_records",
            "ENGINE_HTTP_CONCURRENCY":"http_concurrency", "ENGINE_REQUEST_DELAY":"request_delay",
            "ENGINE_MODEL_ID":"model_id", "ENGINE_MODEL_CACHE":"model_cache",
            "OPENAI_COMPAT_BASE_URL":"remote_base_url", "OPENAI_COMPAT_API_KEY":"remote_api_key",
            "OPENAI_COMPAT_MODEL":"remote_model", "SMTP_HOST":"smtp_host", "SMTP_PORT":"smtp_port",
            "SMTP_USERNAME":"smtp_username", "SMTP_PASSWORD":"smtp_password", "SMTP_FROM":"smtp_from",
            "TELEGRAM_BOT_TOKEN":"telegram_bot_token",
        }
        types = {f.name: f.type for f in fields(cls)}
        for env_name, key in env_map.items():
            if env_name in os.environ:
                values[key] = os.environ[env_name]
        int_fields = {"max_response_bytes","max_pages","max_records","http_concurrency","max_file_bytes","max_preview_rows","model_max_new_tokens","model_context_length","smtp_port","bind_port"}
        float_fields = {"http_timeout","request_delay","temperature"}
        bool_fields = {"allow_remote_model","allow_public_bind"}
        for key, value in list(values.items()):
            if key in int_fields: values[key] = int(value)
            elif key in float_fields: values[key] = float(value)
            elif key in bool_fields and isinstance(value, str): values[key] = value.lower() in ("1","true","yes","on")
        cfg = cls(**values)
        cfg.validate()
        return cfg

    def validate(self) -> None:
        if self.http_timeout <= 0 or self.http_timeout > 300: raise ValueError("http_timeout must be in (0, 300]")
        if not 1_024 <= self.max_response_bytes <= 100_000_000: raise ValueError("max_response_bytes outside safe range")
        if not 1 <= self.max_pages <= 10_000: raise ValueError("max_pages must be between 1 and 10000")
        if not 1 <= self.max_records <= 1_000_000: raise ValueError("max_records must be between 1 and 1000000")
        if not 1 <= self.http_concurrency <= 32: raise ValueError("http_concurrency must be between 1 and 32")
        if self.request_delay < 0 or self.request_delay > 60: raise ValueError("request_delay must be between 0 and 60 seconds")
        if not 1 <= self.model_max_new_tokens <= 8192: raise ValueError("model_max_new_tokens out of range")
        if not 256 <= self.model_context_length <= 131072: raise ValueError("model_context_length out of range")
        if not -0.0 <= self.temperature <= 2.0: raise ValueError("temperature must be between 0 and 2")
        if self.bind_host not in ("127.0.0.1", "localhost") and not self.allow_public_bind:
            raise ValueError("Public bind requires allow_public_bind=true and a separately secured deployment")

    def public_dict(self) -> dict[str, Any]:
        value = asdict(self)
        for key in ("remote_api_key", "smtp_password", "telegram_bot_token"):
            value[key] = "[configured]" if value.get(key) else "[not configured]"
        return value

    def export_json(self, path: str | Path) -> None:
        value = asdict(self)
        for key in ("remote_api_key", "smtp_password", "telegram_bot_token"):
            value[key] = ""
        Path(path).write_text(json.dumps(value, indent=2), encoding="utf-8")
