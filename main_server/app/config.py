from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Azure Storage Settings
    AZURE_STORAGE_CONNECTION_STRING: str
    AZURE_CONTAINER_NAME: str

    model_config = SettingsConfigDict(env_file="./.env")

settings = Settings()