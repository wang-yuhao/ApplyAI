"""
Configuration - GEMINI AS PRIMARY AI PROVIDER
Complete settings with Google Gemini as the default AI model
"""

import os
from typing import Dict, Any, List
from pydantic_settings import BaseSettings
from functools import lru_cache
import json


class Settings(BaseSettings):
    """Application Settings - Gemini Primary"""
    
    # ============================================================================
    # Application Configuration
    # ============================================================================
    
    APP_NAME: str = "Job Application Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    RELOAD_ON_CHANGE: bool = True
    SHOW_DOCS: bool = True
    
    # ============================================================================
    # Database Configuration
    # ============================================================================
    
    DATABASE_URL: str = "sqlite:///./job_assistant.db"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_POOL_RECYCLE: int = 3600
    DATABASE_ECHO: bool = False
    
    # ============================================================================
    # Security Configuration
    # ============================================================================
    
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days
    
    # ============================================================================
    # CORS Configuration
    # ============================================================================
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # ============================================================================
    # File Upload Configuration
    # ============================================================================
    
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    MAX_UPLOAD_SIZE: int = 10485760
    UPLOAD_CHUNK_SIZE: int = 1048576
    ALLOWED_EXTENSIONS: List[str] = ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png']
    
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER: str = "uploads"
    
    # ============================================================================
    # AI Provider Configuration - GEMINI PRIMARY
    # ============================================================================
    
    # PRIMARY AI PROVIDER: GEMINI
    AI_PROVIDER: str = "gemini"
    
    ENABLE_AI_FALLBACK: bool = True
    AI_FALLBACK_ORDER: List[str] = ["gemini", "openai", "perplexity", "anthropic", "newapi"]
    
    AI_RATE_LIMIT_PER_MINUTE: int = 50
    AI_RATE_LIMIT_PER_HOUR: int = 1000
    
    # =============================================================================
    # GOOGLE GEMINI CONFIGURATION (PRIMARY)
    # =============================================================================
    GOOGLE_GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    GEMINI_MAX_TOKENS: int = 8192
    GEMINI_TEMPERATURE: float = 0.7
    GEMINI_TIMEOUT: int = 60
    
    # Available Gemini models:
    # - gemini-2.0-flash-exp (latest, fastest, experimental)
    # - gemini-1.5-pro (stable, large context)
    # - gemini-1.5-flash (fast, efficient)
    # - gemini-pro (stable, general purpose)
    
    # =============================================================================
    # FALLBACK AI PROVIDERS (Optional)
    # =============================================================================
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_MAX_TOKENS: int = 4096
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_TIMEOUT: int = 60
    
    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    ANTHROPIC_MAX_TOKENS: int = 8192
    ANTHROPIC_TEMPERATURE: float = 0.7
    ANTHROPIC_TIMEOUT: int = 60
    
    # Perplexity
    PERPLEXITY_API_KEY: str = ""
    PERPLEXITY_MODEL: str = "llama-3.1-sonar-small-128k-online"
    PERPLEXITY_MAX_TOKENS: int = 4096
    PERPLEXITY_TEMPERATURE: float = 0.7
    PERPLEXITY_TIMEOUT: int = 60
    
    # NewAPI
    NEWAPI_API_KEY: str = ""
    NEWAPI_BASE_URL: str = "https://api.newapi.pro/v1"
    NEWAPI_MODEL: str = "gpt-4o"
    NEWAPI_MAX_TOKENS: int = 4096
    NEWAPI_TEMPERATURE: float = 0.7
    NEWAPI_TIMEOUT: int = 60
    
    # ============================================================================
    # Google OAuth & Gmail Configuration
    # ============================================================================
    
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    
    GMAIL_API_CREDENTIALS_PATH: str = "credentials.json"
    GMAIL_TOKEN_PATH: str = "token.json"
    GMAIL_SCOPES: List[str] = ["https://www.googleapis.com/auth/gmail.readonly"]
    
    # ============================================================================
    # Email Configuration
    # ============================================================================
    
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@jobassistant.com"
    
    # ============================================================================
    # Job Search Configuration
    # ============================================================================
    
    JOB_PLATFORMS: List[str] = ["linkedin", "indeed", "glassdoor", "monster"]
    JOB_SEARCH_TIMEOUT: int = 30
    JOB_SEARCH_MAX_RESULTS: int = 50
    JOB_SEARCH_CACHE_TTL: int = 300
    
    # ============================================================================
    # Redis Configuration
    # ============================================================================
    
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TIMEOUT: int = 5
    REDIS_MAX_CONNECTIONS: int = 10
    
    # ============================================================================
    # Celery Configuration
    # ============================================================================
    
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # ============================================================================
    # Rate Limiting Configuration
    # ============================================================================
    
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # ============================================================================
    # Logging Configuration
    # ============================================================================
    
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: str = ""
    
    # ============================================================================
    # Monitoring & Observability
    # ============================================================================
    
    ENABLE_METRICS: bool = True
    ENABLE_TRACING: bool = False
    APPINSIGHTS_INSTRUMENTATIONKEY: str = ""
    
    # ============================================================================
    # Performance Configuration
    # ============================================================================
    
    ENABLE_GZIP: bool = True
    GZIP_MINIMUM_SIZE: int = 1000
    
    # ============================================================================
    # Cache Configuration
    # ============================================================================
    
    CACHE_TTL_DEFAULT: int = 300
    CACHE_TTL_PROFILE: int = 600
    CACHE_TTL_JOBS: int = 1800
    
    # ============================================================================
    # Feature Flags
    # ============================================================================
    
    ENABLE_EMAIL_INTEGRATION: bool = True
    ENABLE_AUTO_APPLY: bool = False
    ENABLE_INTERVIEW_SCHEDULING: bool = True
    ENABLE_ANALYTICS: bool = True
    
    # ============================================================================
    # Helper Methods
    # ============================================================================
    
    def get_ai_config(self, provider: str) -> Dict[str, Any]:
        """
        Get AI provider configuration
        Gemini is the primary provider with optimized settings
        """
        
        configs = {
            "gemini": {
                "api_key": self.GOOGLE_GEMINI_API_KEY,
                "model": self.GEMINI_MODEL,
                "max_tokens": self.GEMINI_MAX_TOKENS,
                "temperature": self.GEMINI_TEMPERATURE,
                "timeout": self.GEMINI_TIMEOUT,
                "base_url": "https://generativelanguage.googleapis.com/v1beta"
            },
            "openai": {
                "api_key": self.OPENAI_API_KEY,
                "model": self.OPENAI_MODEL,
                "max_tokens": self.OPENAI_MAX_TOKENS,
                "temperature": self.OPENAI_TEMPERATURE,
                "timeout": self.OPENAI_TIMEOUT
            },
            "anthropic": {
                "api_key": self.ANTHROPIC_API_KEY,
                "model": self.ANTHROPIC_MODEL,
                "max_tokens": self.ANTHROPIC_MAX_TOKENS,
                "temperature": self.ANTHROPIC_TEMPERATURE,
                "timeout": self.ANTHROPIC_TIMEOUT
            },
            "perplexity": {
                "api_key": self.PERPLEXITY_API_KEY,
                "model": self.PERPLEXITY_MODEL,
                "max_tokens": self.PERPLEXITY_MAX_TOKENS,
                "temperature": self.PERPLEXITY_TEMPERATURE,
                "timeout": self.PERPLEXITY_TIMEOUT
            },
            "newapi": {
                "api_key": self.NEWAPI_API_KEY,
                "base_url": self.NEWAPI_BASE_URL,
                "model": self.NEWAPI_MODEL,
                "max_tokens": self.NEWAPI_MAX_TOKENS,
                "temperature": self.NEWAPI_TEMPERATURE,
                "timeout": self.NEWAPI_TIMEOUT
            }
        }
        
        return configs.get(provider, {})
    
    def has_any_ai_provider(self) -> bool:
        """Check if at least one AI provider is configured"""
        return any([
            self.GOOGLE_GEMINI_API_KEY,
            self.OPENAI_API_KEY,
            self.ANTHROPIC_API_KEY,
            self.PERPLEXITY_API_KEY,
            self.NEWAPI_API_KEY
        ])
    
    def get_available_providers(self) -> List[str]:
        """Get list of available AI providers (Gemini first)"""
        providers = []
        
        # Gemini first (primary)
        if self.GOOGLE_GEMINI_API_KEY:
            providers.append("gemini")
        
        # Then fallbacks in order
        if self.OPENAI_API_KEY:
            providers.append("openai")
        if self.PERPLEXITY_API_KEY:
            providers.append("perplexity")
        if self.ANTHROPIC_API_KEY:
            providers.append("anthropic")
        if self.NEWAPI_API_KEY:
            providers.append("newapi")
        
        return providers
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # Allow extra fields from .env


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()


# ============================================================================
# Startup Validation
# ============================================================================

def validate_configuration():
    """Validate configuration on startup"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📊 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🔧 Debug mode: {settings.DEBUG}")
    logger.info(f"🗄️  Database: {settings.DATABASE_URL}")
    
    available_providers = settings.get_available_providers()
    
    if available_providers:
        logger.info(f"✅ AI Providers available: {', '.join(available_providers)}")
        logger.info(f"🎯 Primary provider: {settings.AI_PROVIDER}")
        
        # Show model details for each provider
        for provider in available_providers:
            config = settings.get_ai_config(provider)
            model = config.get('model', 'N/A')
            
            if provider == "gemini":
                logger.info(f"   🌟 {provider}: {model} (PRIMARY)")
            else:
                logger.info(f"   - {provider}: {model} (fallback)")
        
        logger.info(f"🔄 Fallback enabled: {settings.ENABLE_AI_FALLBACK}")
        
        # Warn if Gemini is not available
        if "gemini" not in available_providers:
            logger.warning("⚠️  Gemini (primary AI) not configured!")
            logger.warning("⚠️  Get free API key: https://aistudio.google.com/app/apikey")
    else:
        logger.warning("⚠️  No AI provider API keys configured")
        logger.warning("⚠️  System will use regex-based fallback methods")
        logger.warning("⚠️  Get free Gemini key: https://aistudio.google.com/app/apikey")
    
    # Create upload directory if needed
    import os
    if not os.path.exists(settings.UPLOAD_DIR):
        os.makedirs(settings.UPLOAD_DIR)
        logger.info(f"📁 Created upload directory: {settings.UPLOAD_DIR}")
    
    return True


if __name__ != "__main__":
    try:
        validate_configuration()
    except Exception as e:
        import logging
        logging.error(f"Configuration validation failed: {e}")


# ============================================================================
# Helper Functions
# ============================================================================

def get_model_name(provider: str) -> str:
    """Get the model name for a provider"""
    config = settings.get_ai_config(provider)
    return config.get("model", "unknown")


def is_provider_available(provider: str) -> bool:
    """Check if a specific provider is available"""
    return provider in settings.get_available_providers()


def get_primary_ai_info() -> Dict[str, str]:
    """Get information about the primary AI provider"""
    return {
        "provider": settings.AI_PROVIDER,
        "model": get_model_name(settings.AI_PROVIDER),
        "status": "available" if is_provider_available(settings.AI_PROVIDER) else "unavailable"
    }