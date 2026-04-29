from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # En Vercel usar /tmp para SQLite
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:////tmp/bustaTv.db" if os.getenv("VERCEL") else "sqlite:///./bustaTv.db"
    )

    SECRET_API_KEY: str = "bustatv-dev-secret-key-changeme"

    class Config:
        env_file = ".env"

settings = Settings()
