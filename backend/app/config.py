import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "DrawSync"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    SOCKET_PORT: int = 8001
    
    # Database
    DATABASE_URL: str = "sqlite:///./drawsync.db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Game Settings
    MAX_PLAYERS_PER_ROOM: int = 8
    MIN_PLAYERS_TO_START: int = 2
    DRAWING_TIME_LIMIT: int = 60  # seconds
    ROUNDS_PER_GAME: int = 5
    
    # Words Database
    WORDS_FILE: str = "words.txt"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings() 