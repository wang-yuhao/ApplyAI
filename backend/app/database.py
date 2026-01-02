"""
Database Configuration and Connection Management
Enhanced with connection pooling, error handling, and async support
"""

from sqlalchemy import create_engine, event, pool
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator, Optional
import logging
from contextlib import contextmanager
import time

from app.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# ============================================================================
# Database Engine Configuration
# ============================================================================

# Create database engine with optimized settings
engine = create_engine(
    settings.DATABASE_URL,
    # Connection Pooling
    poolclass=QueuePool,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_recycle=settings.DATABASE_POOL_RECYCLE,
    pool_pre_ping=True,  # Verify connections before using
    
    # Query Optimization
    echo=settings.DATABASE_ECHO,  # Log SQL queries in debug mode
    echo_pool=settings.DEBUG,  # Log pool checkouts/checkins
    
    # Performance Settings
    connect_args={
        "connect_timeout": 10,
        "options": "-c timezone=utc",
        "application_name": settings.APP_NAME,
    },
    
    # Isolation Level
    isolation_level="READ COMMITTED",
)

# ============================================================================
# Session Factory
# ============================================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,  # Don't expire objects after commit
)

# ============================================================================
# Base Class for Models
# ============================================================================

Base = declarative_base()

# ============================================================================
# Database Event Listeners
# ============================================================================

@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Handle new database connections"""
    connection_record.info["pid"] = dbapi_conn.get_backend_pid()
    logger.debug(f"New database connection established: PID {connection_record.info['pid']}")


@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Handle connection checkout from pool"""
    pid = connection_record.info.get("pid")
    logger.debug(f"Connection checked out from pool: PID {pid}")


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Handle connection return to pool"""
    pid = connection_record.info.get("pid")
    logger.debug(f"Connection returned to pool: PID {pid}")


@event.listens_for(pool.Pool, "connect")
def set_session_parameters(dbapi_conn, connection_record):
    """Set PostgreSQL session parameters"""
    cursor = dbapi_conn.cursor()
    
    # Set timezone to UTC
    cursor.execute("SET timezone='UTC'")
    
    # Set statement timeout (30 seconds)
    cursor.execute("SET statement_timeout = '30s'")
    
    # Set lock timeout (10 seconds)
    cursor.execute("SET lock_timeout = '10s'")
    
    cursor.close()
    logger.debug("Session parameters configured")


# ============================================================================
# Database Connection Functions
# ============================================================================

def get_db() -> Generator[Session, None, None]:
    """
    Dependency for getting database session in FastAPI endpoints.
    Automatically handles session lifecycle and error handling.
    
    Yields:
        Session: SQLAlchemy database session
        
    Example:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database sessions outside of FastAPI.
    Useful for background tasks, scripts, and CLI operations.
    
    Yields:
        Session: SQLAlchemy database session
        
    Example:
        with get_db_context() as db:
            users = db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        logger.error(f"Database context error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


# ============================================================================
# Database Initialization
# ============================================================================

def init_db() -> None:
    """
    Initialize database - create all tables.
    Should be called once when setting up the application.
    
    Raises:
        Exception: If database initialization fails
    """
    try:
        logger.info("Initializing database...")
        Base.metadata.create_all(bind=engine)
        logger.info("✓ Database tables created successfully")
        
        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"✓ Created {len(tables)} tables: {', '.join(tables)}")
        
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {str(e)}")
        raise


def drop_db() -> None:
    """
    Drop all database tables.
    ⚠️ WARNING: This will delete ALL data! Use with extreme caution.
    
    Raises:
        Exception: If database drop fails
    """
    logger.warning("Dropping all database tables...")
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("✓ All tables dropped successfully")
    except Exception as e:
        logger.error(f"✗ Failed to drop tables: {str(e)}")
        raise


def reset_db() -> None:
    """
    Reset database - drop and recreate all tables.
    ⚠️ WARNING: This will delete ALL data!
    """
    logger.warning("Resetting database...")
    drop_db()
    init_db()
    logger.info("✓ Database reset complete")


# ============================================================================
# Database Health Check
# ============================================================================

def check_db_connection() -> bool:
    """
    Check if database connection is healthy.
    
    Returns:
        bool: True if connection is healthy, False otherwise
    """
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        logger.info("✓ Database connection healthy")
        return True
    except Exception as e:
        logger.error(f"✗ Database connection failed: {str(e)}")
        return False


def get_db_info() -> dict:
    """
    Get database information and statistics.
    
    Returns:
        dict: Database information including version, size, connections
    """
    try:
        with engine.connect() as conn:
            # PostgreSQL version
            version_result = conn.execute("SELECT version()")
            version = version_result.scalar()
            
            # Database size
            size_result = conn.execute(
                "SELECT pg_size_pretty(pg_database_size(current_database()))"
            )
            size = size_result.scalar()
            
            # Active connections
            connections_result = conn.execute(
                "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"
            )
            connections = connections_result.scalar()
            
            # Table count
            tables_result = conn.execute(
                "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
            )
            table_count = tables_result.scalar()
            
            return {
                "version": version,
                "size": size,
                "active_connections": connections,
                "table_count": table_count,
                "pool_size": engine.pool.size(),
                "checked_out_connections": engine.pool.checkedout(),
                "overflow_connections": engine.pool.overflow(),
            }
    except Exception as e:
        logger.error(f"Failed to get database info: {str(e)}")
        return {"error": str(e)}


# ============================================================================
# Database Utilities
# ============================================================================

class DatabaseManager:
    """Database management utility class"""
    
    @staticmethod
    def create_tables():
        """Create all database tables"""
        init_db()
    
    @staticmethod
    def drop_tables():
        """Drop all database tables"""
        drop_db()
    
    @staticmethod
    def reset_tables():
        """Reset all database tables"""
        reset_db()
    
    @staticmethod
    def check_health() -> bool:
        """Check database health"""
        return check_db_connection()
    
    @staticmethod
    def get_info() -> dict:
        """Get database information"""
        return get_db_info()
    
    @staticmethod
    def backup_database(backup_path: str) -> bool:
        """
        Create database backup using pg_dump
        
        Args:
            backup_path: Path where backup should be saved
            
        Returns:
            bool: True if backup successful
        """
        import subprocess
        from urllib.parse import urlparse
        
        try:
            # Parse database URL
            parsed = urlparse(settings.DATABASE_URL)
            
            # Prepare pg_dump command
            cmd = [
                "pg_dump",
                "-h", parsed.hostname,
                "-p", str(parsed.port or 5432),
                "-U", parsed.username,
                "-d", parsed.path.lstrip("/"),
                "-F", "c",  # Custom format
                "-f", backup_path,
            ]
            
            # Set password as environment variable
            import os
            env = os.environ.copy()
            env["PGPASSWORD"] = parsed.password
            
            # Execute backup
            subprocess.run(cmd, env=env, check=True)
            logger.info(f"✓ Database backed up to {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"✗ Database backup failed: {str(e)}")
            return False
    
    @staticmethod
    def get_table_sizes() -> list:
        """
        Get sizes of all database tables
        
        Returns:
            list: List of dictionaries with table names and sizes
        """
        try:
            with engine.connect() as conn:
                result = conn.execute("""
                    SELECT 
                        schemaname as schema,
                        tablename as table,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                    FROM pg_tables
                    WHERE schemaname = 'public'
                    ORDER BY size_bytes DESC
                """)
                
                tables = []
                for row in result:
                    tables.append({
                        "schema": row[0],
                        "table": row[1],
                        "size": row[2],
                        "size_bytes": row[3],
                    })
                return tables
                
        except Exception as e:
            logger.error(f"Failed to get table sizes: {str(e)}")
            return []


# ============================================================================
# Transaction Management
# ============================================================================

class TransactionManager:
    """Context manager for explicit transaction control"""
    
    def __init__(self, db: Session):
        self.db = db
        self.savepoint = None
    
    def __enter__(self):
        """Begin transaction"""
        self.savepoint = self.db.begin_nested()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Commit or rollback transaction"""
        if exc_type is None:
            try:
                self.savepoint.commit()
            except Exception as e:
                self.savepoint.rollback()
                logger.error(f"Transaction commit failed: {str(e)}")
                raise
        else:
            self.savepoint.rollback()
            logger.error(f"Transaction rolled back due to: {exc_val}")


# ============================================================================
# Main Execution
# ============================================================================

if __name__ == "__main__":
    """
    Run this script directly to initialize or check the database
    Usage: python -m app.database
    """
    import sys
    
    print("=" * 60)
    print(f"Database Manager - {settings.APP_NAME}")
    print("=" * 60)
    
    # Check connection
    print("\n1. Checking database connection...")
    if check_db_connection():
        print("   ✓ Connection successful")
    else:
        print("   ✗ Connection failed")
        sys.exit(1)
    
    # Get database info
    print("\n2. Database Information:")
    info = get_db_info()
    for key, value in info.items():
        print(f"   {key}: {value}")
    
    # Initialize tables
    print("\n3. Creating database tables...")
    try:
        init_db()
        print("   ✓ Tables created successfully")
    except Exception as e:
        print(f"   ✗ Failed to create tables: {str(e)}")
        sys.exit(1)
    
    # Get table sizes
    print("\n4. Table Sizes:")
    db_manager = DatabaseManager()
    tables = db_manager.get_table_sizes()
    for table in tables:
        print(f"   {table['table']}: {table['size']}")
    
    print("\n" + "=" * 60)
    print("Database initialization complete!")
    print("=" * 60)