"""
Authentication Router - FINAL FIX
- JWT subject as string (fixes "Subject must be a string" error)
- All other fixes included
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import logging
import secrets

# Password hashing and JWT
from passlib.context import CryptContext
from jose import JWTError, jwt

# Google OAuth
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False
    logging.warning("Google auth not installed")

from app.database import get_db
from app.models import User
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ============================================================================
# Pydantic Models
# ============================================================================

class GoogleLoginRequest(BaseModel):
    """Google OAuth login request"""
    token: str

class RegisterRequest(BaseModel):
    """Registration request"""
    email: str
    password: str
    full_name: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    """Change password request"""
    old_password: str
    new_password: str


# ============================================================================
# Utility Functions
# ============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return False


def get_password_hash(password: str) -> str:
    """Hash password - with length check"""
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Password hashing error: {str(e)}")
        return pwd_context.hash(secrets.token_urlsafe(32)[:72])


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token
    
    FIXED: Ensures 'sub' (subject) is always a string
    """
    to_encode = data.copy()
    
    # CRITICAL FIX: Convert user_id to string
    if 'sub' in to_encode:
        to_encode['sub'] = str(to_encode['sub'])
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    try:
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        logger.debug(f"✅ JWT created with sub={to_encode['sub']} (type: {type(to_encode['sub'])})")
        return encoded_jwt
    except Exception as e:
        logger.error(f"JWT encoding error: {str(e)}")
        raise


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from token
    
    FIXED: Handles both string and integer user_id from JWT
    """
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        
        if user_id_str is None:
            logger.warning("JWT missing 'sub' claim")
            raise credentials_exception
        
        # Convert string back to integer
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            logger.warning(f"Invalid user_id in JWT: {user_id_str}")
            raise credentials_exception
        
        logger.debug(f"✅ JWT decoded: user_id={user_id}")
    
    except JWTError as e:
        logger.warning(f"JWT decode error: {str(e)}")
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        logger.warning(f"User not found: {user_id}")
        raise credentials_exception
    
    logger.debug(f"✅ User authenticated: {user.email}")
    return user


# ============================================================================
# Authentication Endpoints
# ============================================================================

@router.post("/register")
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Register new user"""
    
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(request.password)
    new_user = User(
        email=request.email,
        hashed_password=hashed_password,
        full_name=request.full_name,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"✅ User registered: {request.email}")
    
    # FIXED: user_id will be converted to string in create_access_token
    access_token = create_access_token(data={"sub": new_user.id})
    
    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name
        },
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login user and return access token"""
    
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive"
        )
    
    user.last_login = datetime.utcnow()
    db.commit()
    
    # FIXED: user_id will be converted to string in create_access_token
    access_token = create_access_token(data={"sub": user.id})
    
    logger.info(f"✅ User logged in: {user.email}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name
        }
    }


# ============================================================================
# Google OAuth Endpoints
# ============================================================================

@router.get("/google")
async def google_login():
    """Get Google OAuth URL"""
    
    if not GOOGLE_AUTH_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google auth not installed. Run: pip install google-auth google-auth-oauthlib"
        )
    
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env"
        )
    
    google_oauth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    
    return {
        "url": google_oauth_url,
        "message": "Redirect user to this URL"
    }


@router.post("/google")
async def google_auth(
    request: GoogleLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate with Google ID token
    
    ALL FIXES APPLIED:
    1. Pydantic model (fixes 422)
    2. Short password (fixes bcrypt error)
    3. String subject in JWT (fixes JWT error)
    """
    
    if not GOOGLE_AUTH_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google auth not installed"
        )
    
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )
    
    try:
        logger.info(f"Verifying Google token (length: {len(request.token)})")
        
        idinfo = id_token.verify_oauth2_token(
            request.token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        logger.info("✅ Google token verified")
        
        email = idinfo.get('email')
        full_name = idinfo.get('name')
        picture = idinfo.get('picture')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        logger.info(f"Google login: {email}")
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user with short random password
            random_password = secrets.token_urlsafe(32)[:60]
            
            user = User(
                email=email,
                full_name=full_name,
                profile_picture=picture,
                hashed_password=get_password_hash(random_password),
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"✅ New user created: {email}")
        else:
            user.last_login = datetime.utcnow()
            if picture and user.profile_picture != picture:
                user.profile_picture = picture
            if full_name and user.full_name != full_name:
                user.full_name = full_name
            db.commit()
            logger.info(f"✅ User logged in: {email}")
        
        # FIXED: user_id will be converted to string in create_access_token
        access_token = create_access_token(data={"sub": user.id})
        
        logger.info(f"✅ Access token created for user_id={user.id}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "profile_picture": user.profile_picture
            }
        }
    
    except ValueError as e:
        logger.error(f"❌ Google token invalid: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Google auth error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@router.get("/google/callback")
async def google_callback(code: str):
    """OAuth callback"""
    return {
        "message": "Use POST /api/auth/google with ID token",
        "code_received": code[:10] + "..."
    }


# ============================================================================
# User Management
# ============================================================================

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "profile_picture": current_user.profile_picture,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }


@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
):
    """Refresh token"""
    access_token = create_access_token(data={"sub": current_user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password"""
    
    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    
    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    
    logger.info(f"Password changed: {current_user.email}")
    
    return {"message": "Password changed successfully"}


@router.delete("/account")
async def delete_account(
    password: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete account"""
    
    if password:
        if not verify_password(password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect password"
            )
    
    current_user.is_active = False
    db.commit()
    
    logger.info(f"Account deactivated: {current_user.email}")
    
    return {"message": "Account deactivated"}


@router.get("/oauth/status")
async def oauth_status():
    """OAuth status"""
    return {
        "google_auth_available": GOOGLE_AUTH_AVAILABLE,
        "google_oauth_configured": bool(settings.GOOGLE_CLIENT_ID),
        "google_client_id": settings.GOOGLE_CLIENT_ID[:20] + "..." if settings.GOOGLE_CLIENT_ID else None
    }