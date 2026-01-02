"""
Database Models - Complete
All models for the job application assistant
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum, JSON, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


# ============================================================================
# Enums
# ============================================================================

class GenderEnum(str, enum.Enum):
    """Gender enum for user profiles"""
    male = "male"
    female = "female"
    non_binary = "non_binary"
    prefer_not_to_say = "prefer_not_to_say"


class DocumentTypeEnum(str, enum.Enum):
    """Document type enum"""
    resume = "resume"
    motivation_letter = "motivation_letter"
    diploma = "diploma"
    certificate = "certificate"
    research_proposal = "research_proposal"
    recommendation_letter = "recommendation_letter"
    transcript = "transcript"
    other = "other"


# ============================================================================
# User Model
# ============================================================================

class User(Base):
    """User account model"""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"


# ============================================================================
# User Profile Model
# ============================================================================

class UserProfile(Base):
    """Extended user profile with detailed information"""
    
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Personal Information
    full_name = Column(String(255), nullable=True)
    gender = Column(Enum(GenderEnum), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    personal_website = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    profile_image_url = Column(String(500), nullable=True)
    
    # Professional Summary
    current_title = Column(String(255), nullable=True)
    years_of_experience = Column(Integer, default=0)
    professional_summary = Column(Text, nullable=True)
    
    # Structured Data (JSON fields)
    work_experience = Column(JSON, default=list)  # Array of work experiences
    education = Column(JSON, default=list)  # Array of education entries
    projects = Column(JSON, default=list)  # Array of projects
    technical_skills = Column(JSON, default=dict)  # Object with skill categories
    languages = Column(JSON, default=list)  # Array of languages with proficiency
    training_certifications = Column(JSON, default=list)  # Array of certifications
    publications = Column(JSON, default=list)  # Array of publications
    awards_honors = Column(JSON, default=list)  # Array of awards
    online_courses = Column(JSON, default=list)  # Array of online courses
    volunteer_work = Column(JSON, default=list)  # Array of volunteer experiences
    
    # Resume Settings
    resume_template = Column(String(50), default="modern")  # modern, professional, academic
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    
    def __repr__(self):
        return f"<UserProfile user_id={self.user_id}>"


# ============================================================================
# Document Model
# ============================================================================

class Document(Base):
    """Document storage model for resumes, certificates, etc."""
    
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Document Information
    document_type = Column(Enum(DocumentTypeEnum), nullable=False, index=True)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(BigInteger, nullable=True)  # Size in bytes
    mime_type = Column(String(100), nullable=True)
    
    # Metadata
    description = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="documents")
    
    def __repr__(self):
        return f"<Document {self.document_type}: {self.file_name}>"


# ============================================================================
# Job Application Model
# ============================================================================

class JobApplication(Base):
    """Job application tracking model"""
    
    __tablename__ = "job_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Job Information
    job_title = Column(String(500), nullable=False)
    company_name = Column(String(500), nullable=False)
    company_website = Column(String(1000), nullable=True)
    job_url = Column(String(1000), nullable=True)
    job_description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    salary_range = Column(String(100), nullable=True)
    employment_type = Column(String(50), nullable=True)  # Full-time, Part-time, Contract, etc.
    
    # Application Status
    status = Column(String(50), default="saved")  # saved, applied, interviewing, offered, rejected, accepted
    applied_date = Column(DateTime, nullable=True)
    
    # Application Materials
    cover_letter = Column(Text, nullable=True)
    resume_version = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    
    # AI Analysis
    match_score = Column(Integer, nullable=True)  # 0-100
    ai_analysis = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<JobApplication {self.job_title} at {self.company_name}>"


# ============================================================================
# Interview Model
# ============================================================================

class Interview(Base):
    """Interview scheduling and tracking"""
    
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=False)
    
    # Interview Details
    interview_type = Column(String(50), nullable=True)  # phone, video, in-person, technical, etc.
    scheduled_date = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    location = Column(String(500), nullable=True)
    meeting_link = Column(String(1000), nullable=True)
    
    # Interviewer Information
    interviewer_name = Column(String(255), nullable=True)
    interviewer_title = Column(String(255), nullable=True)
    interviewer_email = Column(String(255), nullable=True)
    
    # Interview Preparation
    preparation_notes = Column(Text, nullable=True)
    questions_to_ask = Column(JSON, default=list)
    expected_questions = Column(JSON, default=list)
    
    # Post-Interview
    completed = Column(Boolean, default=False)
    feedback = Column(Text, nullable=True)
    outcome = Column(String(50), nullable=True)  # passed, rejected, pending
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    application = relationship("JobApplication", back_populates="interviews")
    
    def __repr__(self):
        return f"<Interview for application_id={self.application_id}>"


# ============================================================================
# Saved Job Model
# ============================================================================

class SavedJob(Base):
    """Saved jobs for later review"""
    
    __tablename__ = "saved_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Job Information
    job_title = Column(String(500), nullable=False)
    company_name = Column(String(500), nullable=False)
    job_url = Column(String(1000), nullable=True)
    job_description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    salary_range = Column(String(100), nullable=True)
    
    # Source
    platform = Column(String(100), nullable=True)  # linkedin, indeed, etc.
    external_id = Column(String(255), nullable=True)  # ID from external platform
    
    # Metadata
    tags = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<SavedJob {self.job_title} at {self.company_name}>"


# ============================================================================
# Activity Log Model
# ============================================================================

class ActivityLog(Base):
    """User activity logging"""
    
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Activity Information
    activity_type = Column(String(100), nullable=False)  # resume_upload, job_search, application_submit, etc.
    description = Column(Text, nullable=True)
    activity_metadata = Column(JSON, nullable=True)  # RENAMED from 'metadata' (reserved word)
    
    # IP and User Agent
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ActivityLog {self.activity_type} by user_id={self.user_id}>"