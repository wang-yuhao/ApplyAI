"""
Applications Router - COMPLETE
Handles /api/applications endpoints (fixes 404 error)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import logging

from app.database import get_db
from app.models import User, JobApplication
from app.services.ai_agent import AIAgent

# Import get_current_user from auth router
import sys
sys.path.append('.')
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Pydantic Models
# ============================================================================

class ApplicationCreate(BaseModel):
    """Create application request"""
    job_title: str
    company_name: str
    job_url: Optional[str] = None
    job_description: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[str] = "saved"
    cover_letter: Optional[str] = None
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    """Update application request"""
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    job_url: Optional[str] = None
    job_description: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[str] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None
    applied_date: Optional[datetime] = None


# ============================================================================
# Applications Endpoints
# ============================================================================

@router.get("/")
async def get_applications(
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all applications for current user
    
    Fixes 404: GET /api/applications
    """
    
    query = db.query(JobApplication).filter(
        JobApplication.user_id == current_user.id
    )
    
    if status:
        query = query.filter(JobApplication.status == status)
    
    applications = query.order_by(JobApplication.created_at.desc()).all()
    
    logger.info(f"Retrieved {len(applications)} applications for user {current_user.email}")
    
    return {
        "applications": [
            {
                "id": app.id,
                "job_title": app.job_title,
                "company_name": app.company_name,
                "location": app.location,
                "status": app.status,
                "applied_date": app.applied_date.isoformat() if app.applied_date else None,
                "match_score": app.match_score,
                "created_at": app.created_at.isoformat(),
                "updated_at": app.updated_at.isoformat()
            }
            for app in applications
        ],
        "total": len(applications)
    }


@router.post("/")
async def create_application(
    application: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new application"""
    
    try:
        new_app = JobApplication(
            user_id=current_user.id,
            job_title=application.job_title,
            company_name=application.company_name,
            job_url=application.job_url,
            job_description=application.job_description,
            location=application.location,
            salary_range=application.salary_range,
            employment_type=application.employment_type,
            status=application.status,
            cover_letter=application.cover_letter,
            notes=application.notes
        )
        
        db.add(new_app)
        db.commit()
        db.refresh(new_app)
        
        logger.info(f"✅ Application created: {new_app.job_title} at {new_app.company_name}")
        
        return {
            "message": "Application created successfully",
            "application": {
                "id": new_app.id,
                "job_title": new_app.job_title,
                "company_name": new_app.company_name,
                "status": new_app.status,
                "created_at": new_app.created_at.isoformat()
            }
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Failed to create application: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create application: {str(e)}"
        )


@router.get("/{application_id}")
async def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get application by ID"""
    
    app = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "id": app.id,
        "job_title": app.job_title,
        "company_name": app.company_name,
        "company_website": app.company_website,
        "job_url": app.job_url,
        "job_description": app.job_description,
        "location": app.location,
        "salary_range": app.salary_range,
        "employment_type": app.employment_type,
        "status": app.status,
        "applied_date": app.applied_date.isoformat() if app.applied_date else None,
        "cover_letter": app.cover_letter,
        "notes": app.notes,
        "match_score": app.match_score,
        "ai_analysis": app.ai_analysis,
        "created_at": app.created_at.isoformat(),
        "updated_at": app.updated_at.isoformat()
    }


@router.put("/{application_id}")
async def update_application(
    application_id: int,
    update_data: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update application"""
    
    app = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(app, key, value)
    
    try:
        db.commit()
        logger.info(f"✅ Application updated: {app.id}")
        return {"message": "Application updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update application: {str(e)}"
        )


@router.delete("/{application_id}")
async def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete application"""
    
    app = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    db.delete(app)
    db.commit()
    
    logger.info(f"✅ Application deleted: {application_id}")
    
    return {"message": "Application deleted successfully"}


@router.post("/{application_id}/generate-cover-letter")
async def generate_cover_letter(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate cover letter using AI"""
    
    app = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    try:
        # Get user profile
        from app.models import UserProfile
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=404,
                detail="Profile not found. Please create a profile first."
            )
        
        # Generate cover letter
        ai_agent = AIAgent()
        
        job_data = {
            "job_title": app.job_title,
            "company_name": app.company_name,
            "description": app.job_description or ""
        }
        
        user_profile = {
            "full_name": profile.full_name or current_user.full_name,
            "professional_summary": profile.professional_summary,
            "work_experience": profile.work_experience,
            "education": profile.education,
            "technical_skills": profile.technical_skills
        }
        
        cover_letter = await ai_agent.generate_cover_letter(user_profile, job_data)
        
        # Save to application
        app.cover_letter = cover_letter
        db.commit()
        
        logger.info(f"✅ Cover letter generated for application {application_id}")
        
        return {
            "message": "Cover letter generated successfully",
            "cover_letter": cover_letter
        }
    
    except Exception as e:
        logger.error(f"❌ Cover letter generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate cover letter: {str(e)}"
        )


@router.post("/{application_id}/verify")
async def verify_application(
    application_id: int,
    verification_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify application data"""
    
    app = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Perform verification logic here
    # This could check for completeness, required fields, etc.
    
    verification_result = {
        "is_complete": bool(app.cover_letter and app.job_description),
        "has_cover_letter": bool(app.cover_letter),
        "has_job_description": bool(app.job_description),
        "status": app.status
    }
    
    return {
        "message": "Application verified",
        "verification": verification_result
    }


@router.post("/{application_id}/submit")
async def submit_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit application"""
    
    app = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update status to applied
    app.status = "applied"
    app.applied_date = datetime.utcnow()
    db.commit()
    
    logger.info(f"✅ Application submitted: {application_id}")
    
    return {
        "message": "Application submitted successfully",
        "applied_date": app.applied_date.isoformat()
    }