from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.models import User, JobApplication, InterviewPreparation, UserProfile
from app.services.ai_agent import AIAgent

router = APIRouter()


@router.get("/{application_id}")
async def get_interview_preparation(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interview preparation for an application"""
    application = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    prep = db.query(InterviewPreparation).filter(
        InterviewPreparation.application_id == application_id
    ).first()
    
    if not prep:
        # Generate new preparation
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == current_user.id
        ).first()
        
        ai_agent = AIAgent(current_user.preferred_ai_provider)
        
        prep_data = await ai_agent.generate_interview_preparation(
            user_profile={
                "full_name": current_user.full_name,
                "current_title": profile.current_title,
                "years_of_experience": profile.years_of_experience,
                "skills": profile.skills or [],
                "education": profile.education or []
            },
            job_info={
                "job_title": application.job.job_title,
                "company_name": application.job.company_name,
                "company_location": application.job.company_location,
                "requirements": application.job.requirements or [],
                "responsibilities": application.job.responsibilities or []
            }
        )
        
        prep = InterviewPreparation(
            application_id=application_id,
            background_analysis=prep_data.get("background_analysis"),
            job_fit_analysis=prep_data.get("job_fit_analysis"),
            development_plan=prep_data.get("development_plan"),
            cultural_insights=prep_data.get("cultural_insights"),
            common_questions=prep_data.get("common_questions"),
            behavioral_questions=prep_data.get("behavioral_questions"),
            technical_questions=prep_data.get("technical_questions"),
            interview_tips=prep_data.get("interview_tips"),
            step_by_step_guide=prep_data.get("step_by_step_guide")
        )
        
        db.add(prep)
        db.commit()
        db.refresh(prep)
    
    return prep