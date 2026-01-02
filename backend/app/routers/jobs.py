"""
Jobs Router - WITH AI MATCH
Uses AIAgent.calculate_job_match() for job enrichment
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from app.database import get_db
from app.routers.auth import get_current_user
from app.models import User, JobApplication, SavedJob, UserProfile
from app.services.job_search import JobSearchService
from app.services.ai_agent import AIAgent

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Platform Management
# ============================================================================

@router.get("/platforms")
async def get_platforms(
    current_user: User = Depends(get_current_user)
):
    """
    Get available job search platforms
    
    Returns list of supported job boards with metadata
    """
    
    job_search = JobSearchService()
    
    platforms = [
        {
            "key": key,
            "name": info["name"],
            "url": info["url"],
            "category": info["category"]
        }
        for key, info in job_search.platforms.items()
    ]
    
    return {
        "platforms": platforms,
        "total": len(platforms)
    }


@router.get("/platforms/{platform_key}")
async def get_platform(
    platform_key: str,
    current_user: User = Depends(get_current_user)
):
    """Get details for a specific platform"""
    
    job_search = JobSearchService()
    
    if platform_key not in job_search.platforms:
        raise HTTPException(
            status_code=404,
            detail=f"Platform '{platform_key}' not found"
        )
    
    platform_info = job_search.platforms[platform_key]
    
    return {
        "key": platform_key,
        "name": platform_info["name"],
        "url": platform_info["url"],
        "category": platform_info["category"]
    }


# ============================================================================
# Job Search Endpoints
# ============================================================================

@router.get("/search")
async def search_jobs(
    # Accept both 'query' and 'keyword' for compatibility
    query: Optional[str] = Query(None, description="Job search query"),
    keyword: Optional[str] = Query(None, description="Job search keyword (alias for query)"),
    location: Optional[str] = Query(None, description="Location"),
    platforms: Optional[str] = Query(None, description="Comma-separated platforms"),
    max_results: Optional[int] = Query(20, description="Maximum results per platform"),
    quick_mode: bool = Query(False, description="Quick mode (less results, faster)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for jobs across multiple platforms
    
    Accepts both 'query' and 'keyword' parameters for compatibility
    
    Platforms supported: linkedin, indeed, glassdoor, academic_positions, euraxess, academic_transfer
    """
    
    # Use 'query' if provided, otherwise fall back to 'keyword'
    search_term = query or keyword
    
    if not search_term:
        raise HTTPException(
            status_code=422,
            detail="Either 'query' or 'keyword' parameter is required"
        )
    
    try:
        # Parse platforms
        platform_list = None
        if platforms:
            platform_list = [p.strip() for p in platforms.split(",")]
        
        # Adjust max results based on quick mode
        if quick_mode:
            max_results = min(max_results, 20)
        
        # Initialize job search service
        job_search = JobSearchService()
        
        # FIXED: Use correct parameter names for JobSearchService
        jobs_list = await job_search.search_jobs(
            keyword=search_term,
            location=location,
            platforms=platform_list,
            max_results_per_platform=max_results
        )
        
        logger.info(f"Job search: '{search_term}' - Found {len(jobs_list)} jobs")
        
        # Format response to match expected structure
        return {
            "jobs": jobs_list,
            "total": len(jobs_list),
            "query": search_term,
            "platforms": platform_list or list(job_search.platforms.keys())
        }
    
    except Exception as e:
        logger.error(f"Job search failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Job search failed: {str(e)}"
        )


@router.post("/search/enrich")
async def enrich_job(
    job_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enrich job data with AI-powered match analysis
    
    Uses AIAgent.calculate_job_match() to analyze job fit
    """
    
    try:
        # Get user profile
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            # Return basic enrichment if no profile exists
            logger.warning(f"No profile found for user {current_user.email} - returning basic enrichment")
            return {
                "enriched_job": {
                    **job_data,
                    "enriched": True,
                    "match_score": None,
                    "note": "Create a profile to get AI-powered match analysis"
                }
            }
        
        # Prepare user profile data
        user_profile = {
            "full_name": profile.full_name or "",
            "current_title": profile.current_title or "",
            "years_of_experience": profile.years_of_experience or 0,
            "professional_summary": profile.professional_summary or "",
            "technical_skills": profile.technical_skills or {},
            "work_experience": profile.work_experience or [],
            "education": profile.education or [],
            "projects": profile.projects or []
        }
        
        # Prepare job data for matching
        job_for_matching = {
            "job_title": job_data.get("job_title", ""),
            "company_name": job_data.get("company_name", ""),
            "description": job_data.get("description", ""),
            "requirements": job_data.get("requirements", []),
            "location": job_data.get("location", ""),
            "employment_type": job_data.get("employment_type", "")
        }
        
        # Use AI to calculate match
        ai_agent = AIAgent()
        match_result = await ai_agent.calculate_job_match(user_profile, job_for_matching)
        
        # Enrich job data with match analysis
        enriched_data = {
            **job_data,
            "enriched": True,
            "match_analysis": match_result,
            "match_score": match_result.get("match_rate", 0),
            "match_percentage": match_result.get("match_rate", 0),
            "strengths": match_result.get("pros", []),
            "gaps": match_result.get("cons", []),
            "recommendation": match_result.get("recommendation", ""),
            "ai_analysis": match_result
        }
        
        logger.info(f"Job enriched with AI: {job_data.get('job_title', 'Unknown')} - Match: {match_result.get('match_rate', 0)}%")
        
        return {
            "enriched_job": enriched_data
        }
    
    except Exception as e:
        logger.error(f"Job enrichment failed: {str(e)}")
        
        # Fallback to basic enrichment on error
        return {
            "enriched_job": {
                **job_data,
                "enriched": True,
                "match_score": None,
                "error": f"AI enrichment failed: {str(e)}",
                "note": "Returning job data without AI analysis"
            }
        }


@router.get("/match/{job_id}")
async def get_job_match(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate match score for a specific job"""
    
    # Get user profile
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found. Please create a profile first."
        )
    
    # Get job (from saved jobs or applications)
    job = db.query(SavedJob).filter(
        SavedJob.id == job_id,
        SavedJob.user_id == current_user.id
    ).first()
    
    if not job:
        job = db.query(JobApplication).filter(
            JobApplication.id == job_id,
            JobApplication.user_id == current_user.id
        ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Prepare profile data
    user_profile = {
        "current_title": profile.current_title,
        "years_of_experience": profile.years_of_experience,
        "technical_skills": profile.technical_skills,
        "education": profile.education,
        "work_experience": profile.work_experience
    }
    
    # Prepare job data
    job_data = {
        "job_title": job.job_title,
        "company_name": job.company_name,
        "description": getattr(job, 'job_description', ''),
        "requirements": []
    }
    
    try:
        # Calculate match using AI
        ai_agent = AIAgent()
        match_result = await ai_agent.calculate_job_match(user_profile, job_data)
        
        return match_result
    
    except Exception as e:
        logger.error(f"Job matching failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Job matching failed: {str(e)}"
        )


# ============================================================================
# Saved Jobs Endpoints
# ============================================================================

@router.post("/save")
async def save_job(
    job_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a job for later"""
    
    try:
        saved_job = SavedJob(
            user_id=current_user.id,
            job_title=job_data.get("job_title"),
            company_name=job_data.get("company_name"),
            job_url=job_data.get("job_url"),
            job_description=job_data.get("description"),
            location=job_data.get("location"),
            salary_range=job_data.get("salary_range"),
            platform=job_data.get("platform"),
            external_id=job_data.get("external_id"),
            tags=job_data.get("tags", []),
            notes=job_data.get("notes")
        )
        
        db.add(saved_job)
        db.commit()
        db.refresh(saved_job)
        
        logger.info(f"Job saved: {saved_job.job_title} at {saved_job.company_name}")
        
        return {
            "message": "Job saved successfully",
            "job_id": saved_job.id
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save job: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save job: {str(e)}"
        )


@router.get("/saved")
async def get_saved_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all saved jobs"""
    
    saved_jobs = db.query(SavedJob).filter(
        SavedJob.user_id == current_user.id
    ).order_by(SavedJob.created_at.desc()).all()
    
    return {
        "saved_jobs": [
            {
                "id": job.id,
                "job_title": job.job_title,
                "company_name": job.company_name,
                "location": job.location,
                "salary_range": job.salary_range,
                "platform": job.platform,
                "job_url": job.job_url,
                "tags": job.tags,
                "notes": job.notes,
                "saved_at": job.created_at.isoformat()
            }
            for job in saved_jobs
        ],
        "total": len(saved_jobs)
    }


@router.delete("/saved/{job_id}")
async def delete_saved_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a saved job"""
    
    job = db.query(SavedJob).filter(
        SavedJob.id == job_id,
        SavedJob.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Saved job not found")
    
    db.delete(job)
    db.commit()
    
    return {"message": "Saved job deleted successfully"}

@router.get("/search/stream")
async def search_jobs_stream(
    keyword: str = Query(..., description="Search keyword"),
    location: Optional[str] = Query(None, description="Location filter"),
    platforms: Optional[str] = Query(None, description="Comma-separated platform keys"),
    max_results: int = Query(20, ge=1, le=100, description="Max results per platform"),
    current_user: User = Depends(get_current_user)
):
    """
    Search for jobs with progressive loading (Server-Sent Events)
    Jobs are streamed as they're found
    """
    try:
        platform_list = platforms.split(",") if platforms else None
        
        logger.info(f"🔍 User {current_user.email} streaming search: {keyword}")
        
        async def event_generator():
            """Generate SSE events for each job found"""
            job_count = 0
            
            async for job in job_search_service.search_jobs_progressive(
                keyword=keyword,
                location=location,
                platforms=platform_list,
                max_results_per_platform=max_results
            ):
                job_count += 1
                # Send job as SSE event
                yield f"data: {json.dumps(job)}\n\n"
            
            # Send completion event
            yield f"data: {json.dumps({'event': 'complete', 'total': job_count})}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Streaming search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    
@router.get("/last-search/{keyword}")
async def get_last_search(
    keyword: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get results from the last search for this keyword
    Returns cached results if available (within 5 minutes)
    """
    try:
        logger.info(f"📂 Loading last search for keyword: {keyword}")
        
        last_search = job_search_service.get_last_search(keyword)
        
        if last_search:
            return {
                "success": True,
                "keyword": keyword,
                "cached": True,
                "cached_at": last_search["cached_at"],
                "total_jobs": len(last_search["jobs"]),
                "jobs": last_search["jobs"]
            }
        else:
            return {
                "success": True,
                "keyword": keyword,
                "cached": False,
                "message": "No recent search found for this keyword",
                "total_jobs": 0,
                "jobs": []
            }
        
    except Exception as e:
        logger.error(f"❌ Failed to load last search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load last search: {str(e)}")
# ============================================================================
# Job Applications Endpoints
# ============================================================================

@router.post("/apply")
async def create_application(
    application_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new job application"""
    
    try:
        application = JobApplication(
            user_id=current_user.id,
            job_title=application_data.get("job_title"),
            company_name=application_data.get("company_name"),
            company_website=application_data.get("company_website"),
            job_url=application_data.get("job_url"),
            job_description=application_data.get("job_description"),
            location=application_data.get("location"),
            salary_range=application_data.get("salary_range"),
            employment_type=application_data.get("employment_type"),
            status=application_data.get("status", "saved"),
            cover_letter=application_data.get("cover_letter"),
            resume_version=application_data.get("resume_version"),
            notes=application_data.get("notes"),
            match_score=application_data.get("match_score")
        )
        
        db.add(application)
        db.commit()
        db.refresh(application)
        
        logger.info(f"Application created: {application.job_title} at {application.company_name}")
        
        return {
            "message": "Application created successfully",
            "application_id": application.id
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create application: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create application: {str(e)}"
        )


@router.get("/applications")
async def get_applications(
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all job applications"""
    
    query = db.query(JobApplication).filter(
        JobApplication.user_id == current_user.id
    )
    
    if status:
        query = query.filter(JobApplication.status == status)
    
    applications = query.order_by(JobApplication.created_at.desc()).all()
    
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
                "created_at": app.created_at.isoformat()
            }
            for app in applications
        ],
        "total": len(applications)
    }


@router.get("/applications/{application_id}")
async def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed application information"""
    
    application = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "id": application.id,
        "job_title": application.job_title,
        "company_name": application.company_name,
        "company_website": application.company_website,
        "job_url": application.job_url,
        "job_description": application.job_description,
        "location": application.location,
        "salary_range": application.salary_range,
        "employment_type": application.employment_type,
        "status": application.status,
        "applied_date": application.applied_date.isoformat() if application.applied_date else None,
        "cover_letter": application.cover_letter,
        "resume_version": application.resume_version,
        "notes": application.notes,
        "match_score": application.match_score,
        "ai_analysis": application.ai_analysis,
        "created_at": application.created_at.isoformat(),
        "updated_at": application.updated_at.isoformat()
    }


@router.put("/applications/{application_id}")
async def update_application(
    application_id: int,
    update_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an application"""
    
    application = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update fields
    for key, value in update_data.items():
        if hasattr(application, key):
            setattr(application, key, value)
    
    try:
        db.commit()
        return {"message": "Application updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update application: {str(e)}"
        )


@router.delete("/applications/{application_id}")
async def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an application"""
    
    application = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    db.delete(application)
    db.commit()
    
    return {"message": "Application deleted successfully"}