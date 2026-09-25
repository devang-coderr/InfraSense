"""
Central configuration.

WHAT this file does:
    Reads every value from the ".env" file (via pydantic-settings) so the
    rest of the app never has to know *where* a setting came from.

WHY it matters:
    Nothing secret (passwords, keys) is ever hardcoded in the source code.
    You only ever edit ".env" — never this file — to change configuration.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./infrasense.db"

    # Auth
    SECRET_KEY: str = "dev-only-insecure-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS - comma separated origins
    CORS_ORIGINS: str = "http://localhost:3000"

    # Storage
    STORAGE_PROVIDER: str = "local"  # "local" | "supabase"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "infrasense-media"

    # AI (future use)
    AI_MODEL_PATH: str = ""
    WEATHER_API_KEY: str = ""

    # City bounding box used only to compute the stylised 0-100 x/y map
    # position the frontend's GISMap component expects. This is NOT real
    # GIS projection — it's a cosmetic normalisation. See gis_service.py.
    CITY_LAT_MIN: float = 22.65
    CITY_LAT_MAX: float = 22.78
    CITY_LNG_MIN: float = 75.80
    CITY_LNG_MAX: float = 75.92

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
