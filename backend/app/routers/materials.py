"""
Materials Router - FIXED for UserProfile model structure
Works with individual UserProfile columns (not profile_data)
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
import os
import logging
from datetime import datetime
import PyPDF2
import docx

from app.database import get_db
from app.models import User, UserProfile, Document
from app.auth import get_current_user
from app.services.ai_agent import AIAgent
from app.services.pdf_generator import PDFGenerator

# ✅ NO PREFIX - main.py adds it
router = APIRouter()

logger = logging.getLogger(__name__)


def extract_document_text(file_path: str) -> str:
    """Extract text from PDF or DOCX document"""
    try:
        if file_path.endswith('.pdf'):
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
                
        elif file_path.endswith('.docx'):
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text.strip()
            
        else:
            return ""
            
    except Exception as e:
        logger.error(f"❌ Failed to extract text from {file_path}: {e}")
        return ""


def profile_to_dict(profile: UserProfile) -> dict:
    """
    Convert UserProfile model to dictionary for AI agent
    
    This handles the fact that UserProfile has individual columns
    (work_experience, education, etc.) instead of a single profile_data field
    """
    return {
        "full_name": profile.full_name or "",
        "gender": profile.gender.value if profile.gender else None,
        "phone": profile.phone or "",
        "location": profile.location or "",
        "personal_website": profile.personal_website,
        "github_url": profile.github_url,
        "linkedin_url": profile.linkedin_url,
        "current_title": profile.current_title or "",
        "years_of_experience": profile.years_of_experience or 0,
        "professional_summary": profile.professional_summary or "",
        "work_experience": profile.work_experience or [],
        "education": profile.education or [],
        "projects": profile.projects or [],
        "technical_skills": profile.technical_skills or {},
        "languages": profile.languages or [],
        "training_certifications": profile.training_certifications or [],
        "publications": profile.publications or [],
        "awards_honors": profile.awards_honors or [],
        "online_courses": profile.online_courses or [],
        "volunteer_work": profile.volunteer_work or []
    }


@router.post("/generate-motivation-letter")
async def generate_motivation_letter(
    job_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate motivation letter for a job posting
    
    Request body should include:
    - job_title: str
    - company_name: str
    - company_location: str (optional)
    - description: str
    - requirements: list[str] (optional)
    - template_letter_id: int (optional) - ID of uploaded letter to use as style template
    
    Returns:
        Generated motivation letter with metadata
    """
    try:
        # Initialize AI agent
        ai_agent = AIAgent()
        
        if not ai_agent.is_available():
            raise HTTPException(
                status_code=503,
                detail="AI service not available. Please set at least one AI API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)"
            )
        
        logger.info(f"🎯 Letter request for {job_data.get('job_title')} at {job_data.get('company_name')}")
        
        # Get user profile
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=400,
                detail="Please complete your profile first. Go to Profile page to add your information."
            )
        
        # Check if profile has essential information
        if not profile.full_name and not profile.current_title:
            raise HTTPException(
                status_code=400,
                detail="Please add at least your name and current title to your profile."
            )
        
        # Convert UserProfile to dictionary
        profile_data = profile_to_dict(profile)
        
        # Get template letter content if provided
        template_letter_id = job_data.get('template_letter_id')
        template_content = None
        template_metadata = None
        
        if template_letter_id:
            logger.info(f"📄 Loading template ID: {template_letter_id}")
            
            template_doc = db.query(Document).filter(
                Document.id == template_letter_id,
                Document.user_id == current_user.id,
                Document.document_type == 'motivation_letter'
            ).first()
            
            if template_doc:
                if os.path.exists(template_doc.file_path):
                    logger.info(f"✅ Using template: {template_doc.file_name}")
                    template_content = extract_document_text(template_doc.file_path)
                    
                    if template_content:
                        template_metadata = {
                            "id": template_doc.id,
                            "file_name": template_doc.file_name,
                            "file_size": len(template_content),
                            "word_count": len(template_content.split())
                        }
                    else:
                        logger.warning(f"⚠️ Template {template_letter_id} is empty or couldn't be read")
                else:
                    logger.warning(f"⚠️ Template file not found: {template_doc.file_path}")
            else:
                logger.warning(f"⚠️ Template {template_letter_id} not found in database")
        
        # Generate letter using AI agent
        letter_text = await ai_agent.generate_motivation_letter(
            job_data=job_data,
            profile_data=profile_data,
            user_email=current_user.email,
            template_content=template_content
        )
        
        # Return response
        return {
            "success": True,
            "letter": letter_text,
            "template_used": template_metadata,
            "word_count": len(letter_text.split()),
            "character_count": len(letter_text),
            "job_title": job_data.get('job_title'),
            "company_name": job_data.get('company_name'),
            "generated_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Letter generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate motivation letter: {str(e)}"
        )


@router.post("/download-motivation-letter")
async def download_motivation_letter(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate and download motivation letter as PDF
    
    Request body:
    - letter: str - The motivation letter text
    - job_title: str
    - company_name: str
    """
    try:
        # Get user profile for header info
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(status_code=400, detail="Profile not found")
        
        # Generate PDF
        pdf_buffer = PDFGenerator.generate_motivation_letter_pdf(
            letter_text=data.get('letter', ''),
            job_title=data.get('job_title', 'Position'),
            company_name=data.get('company_name', 'Company'),
            applicant_name=profile.full_name or current_user.full_name or 'Applicant',
            applicant_email=current_user.email,
            applicant_phone=profile.phone or '',
            applicant_address=profile.location or ''
        )
        
        # Generate filename
        safe_company = data.get('company_name', 'Company').replace(' ', '_')[:30]
        safe_company = ''.join(c for c in safe_company if c.isalnum() or c == '_')
        filename = f"Motivation_Letter_{safe_company}.pdf"
        
        logger.info(f"📥 Downloading letter PDF: {filename}")
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ PDF generation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/download-all-materials")
async def download_all_materials(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download all application materials (motivation letter + resume) as merged PDF
    
    Request body:
    - letter: str - The motivation letter text
    - job_title: str
    - company_name: str
    """
    try:
        # Get user profile
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(status_code=400, detail="Profile not found")
        
        # Get latest resume
        resume = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.document_type == 'resume'
        ).order_by(Document.created_at.desc()).first()
        
        # Generate motivation letter PDF
        letter_pdf = PDFGenerator.generate_motivation_letter_pdf(
            letter_text=data.get('letter', ''),
            job_title=data.get('job_title', 'Position'),
            company_name=data.get('company_name', 'Company'),
            applicant_name=profile.full_name or current_user.full_name or 'Applicant',
            applicant_email=current_user.email,
            applicant_phone=profile.phone or '',
            applicant_address=profile.location or ''
        )
        
        # Merge with resume if available
        if resume and os.path.exists(resume.file_path):
            logger.info(f"📎 Merging with resume: {resume.file_name}")
            merged_pdf = PDFGenerator.merge_pdfs([letter_pdf, resume.file_path])
        else:
            logger.warning("⚠️ No resume found, returning letter only")
            merged_pdf = letter_pdf
        
        # Generate filename
        safe_company = data.get('company_name', 'Company').replace(' ', '_')[:30]
        safe_company = ''.join(c for c in safe_company if c.isalnum() or c == '_')
        filename = f"Application_Materials_{safe_company}.pdf"
        
        logger.info(f"📥 Downloading all materials: {filename}")
        
        return Response(
            content=merged_pdf.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Materials download failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates")
async def get_motivation_letter_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of uploaded motivation letters that can be used as templates
    
    Returns:
        List of available template documents
    """
    try:
        templates = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.document_type == 'motivation_letter'
        ).order_by(Document.created_at.desc()).all()
        
        template_list = []
        for doc in templates:
            template_list.append({
                "id": doc.id,
                "file_name": doc.file_name,
                "file_size": doc.file_size,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "preview_available": os.path.exists(doc.file_path) if doc.file_path else False
            })
        
        logger.info(f"✅ Found {len(template_list)} templates for user {current_user.email}")
        
        return {
            "success": True,
            "templates": template_list,
            "count": len(template_list)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get templates: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/{template_id}/preview")
async def preview_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get preview/excerpt of a template letter
    
    Args:
        template_id: ID of the template document
        
    Returns:
        Preview text and metadata
    """
    try:
        template = db.query(Document).filter(
            Document.id == template_id,
            Document.user_id == current_user.id,
            Document.document_type == 'motivation_letter'
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=404,
                detail="Template not found. Make sure you own this document."
            )
        
        if not template.file_path or not os.path.exists(template.file_path):
            raise HTTPException(
                status_code=404,
                detail="Template file not found on server."
            )
        
        # Extract text
        full_text = extract_document_text(template.file_path)
        
        if not full_text:
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from template. File may be corrupted or empty."
            )
        
        # Return first 500 characters as preview
        preview = full_text[:500] + "..." if len(full_text) > 500 else full_text
        
        logger.info(f"📖 Preview template {template_id}: {template.file_name}")
        
        return {
            "success": True,
            "template_id": template_id,
            "file_name": template.file_name,
            "preview": preview,
            "full_length": len(full_text),
            "word_count": len(full_text.split())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to preview template: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test")
async def test_materials_endpoint():
    """
    Test endpoint to verify materials router is working
    """
    ai_agent = AIAgent()
    
    return {
        "status": "ok",
        "message": "Materials router is working!",
        "ai_available": ai_agent.is_available(),
        "endpoints": [
            "POST /api/materials/generate-motivation-letter",
            "POST /api/materials/download-motivation-letter",
            "POST /api/materials/download-all-materials",
            "GET /api/materials/templates",
            "GET /api/materials/templates/{template_id}/preview",
            "GET /api/materials/test"
        ]
    }