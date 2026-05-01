"""App configuration via environment variables."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    cors_origins: list[str] = ["http://localhost:8080", "http://localhost:5173"]
    sla_warn_hours: int = 24
    sla_critical_hours: int = 48
    scoring_weight_budget: float = 0.3
    scoring_weight_recency: float = 0.3
    scoring_weight_engagement: float = 0.4

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
