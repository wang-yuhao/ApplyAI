"""
FastAPI Main Application - FIXED (No Circular Imports)
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
import os
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.routers import materials
from app.routers import auth, profile, jobs, applications, materials

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=settings.LOG_FORMAT
)
logger = logging.getLogger(__name__)


# ============================================================================
# Lifespan Context Manager
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    
    # Startup
    logger.info("=" * 80)
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("=" * 80)
    
    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created/verified")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
    
    # Ensure upload directory exists
    try:
        if not os.path.exists(settings.UPLOAD_DIR):
            os.makedirs(settings.UPLOAD_DIR)
            logger.info(f"📁 Created upload directory: {settings.UPLOAD_DIR}")
        else:
            logger.info(f"📁 Upload directory exists: {settings.UPLOAD_DIR}")
    except Exception as e:
        logger.error(f"❌ Failed to create upload directory: {str(e)}")
    
    # Log configuration
    logger.info(f"📊 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🔧 Debug mode: {settings.DEBUG}")
    logger.info(f"🗄️  Database: {settings.DATABASE_URL}")
    logger.info(f"🎯 Primary AI: {settings.AI_PROVIDER}")
    
    # Check AI providers
    available_providers = settings.get_available_providers()
    if available_providers:
        logger.info(f"✅ AI Providers: {', '.join(available_providers)}")
    else:
        logger.warning("⚠️  No AI providers configured")
    
    logger.info("=" * 80)
    logger.info("✅ Application startup complete")
    logger.info("=" * 80)
    
    yield
    
    # Shutdown
    logger.info("=" * 80)
    logger.info("👋 Shutting down application")
    logger.info("=" * 80)


# ============================================================================
# Create FastAPI Application
# ============================================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Job Application Assistant with AI-powered features",
    docs_url="/docs" if settings.SHOW_DOCS else None,
    redoc_url="/redoc" if settings.SHOW_DOCS else None,
    lifespan=lifespan
)


# ============================================================================
# CORS Middleware
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)


# ============================================================================
# Static Files (for uploaded documents)
# ============================================================================

# Mount uploads directory for serving files
if os.path.exists(settings.UPLOAD_DIR):
    app.mount(
        "/uploads",
        StaticFiles(directory=settings.UPLOAD_DIR),
        name="uploads"
    )
    logger.info(f"📂 Mounted static files: /uploads → {settings.UPLOAD_DIR}")


# ============================================================================
# Exception Handlers
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# ============================================================================
# Include Routers - IMPORT HERE to avoid circular imports
# ============================================================================

# Auth routes
app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"]
)
logger.info("✅ Registered router: /api/auth")

# Profile routes
app.include_router(
    profile.router,
    prefix="/api/profile",
    tags=["Profile"]
)
logger.info("✅ Registered router: /api/profile")

# Materials routes
app.include_router(materials.router, prefix="/api/materials", tags=["materials"])
logger.info("✅ Registered router: /api/materials")

# Applications routes
app.include_router(
    applications.router,
    prefix="/api/applications",
    tags=["Applications"]
)
logger.info("✅ Registered router: /api/applications")
logger.info("   - GET /api/profile/")
logger.info("   - PUT /api/profile/")
logger.info("   - POST /api/profile/upload-resume")
logger.info("   - POST /api/profile/upload-document")
logger.info("   - GET /api/profile/documents")
logger.info("   - GET /api/profile/download-document/{document_id}")
logger.info("   - DELETE /api/profile/document/{document_id}")
logger.info("   - POST /api/profile/generate-resume")
logger.info("   - GET /api/profile/preview-resume/{document_id}")

# Jobs routes
app.include_router(
    jobs.router,
    prefix="/api/jobs",
    tags=["Jobs"]
)
logger.info("✅ Registered router: /api/jobs")


# ============================================================================
# Root Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs" if settings.SHOW_DOCS else None
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }


@app.get("/api/config")
async def get_config():
    """Get public configuration"""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ai_provider": settings.AI_PROVIDER,
        "available_ai_providers": settings.get_available_providers(),
        "cors_origins": settings.CORS_ORIGINS,
        "max_file_size": settings.MAX_FILE_SIZE,
        "allowed_extensions": settings.ALLOWED_EXTENSIONS
    }


# ============================================================================
# Debug Routes (only in development)
# ============================================================================

if settings.DEBUG:
    @app.get("/debug/routes")
    async def debug_routes():
        """List all registered routes (debug only)"""
        routes = []
        for route in app.routes:
            if hasattr(route, "path") and hasattr(route, "methods"):
                routes.append({
                    "path": route.path,
                    "methods": list(route.methods) if route.methods else [],
                    "name": route.name
                })
        return {"routes": routes}
    
    logger.info("✅ Debug routes enabled: /debug/routes")


# ============================================================================
# Startup Message
# ============================================================================

logger.info("")
logger.info("🌟" * 40)
logger.info(f"   {settings.APP_NAME} is ready!")
logger.info(f"   API Documentation: http://localhost:8000/docs")
logger.info(f"   Health Check: http://localhost:8000/health")
logger.info("🌟" * 40)
logger.info("")


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.RELOAD_ON_CHANGE,
        log_level=settings.LOG_LEVEL.lower()
    )