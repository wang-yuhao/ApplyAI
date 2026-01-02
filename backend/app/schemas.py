from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class AIProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    google_id: str


class UserResponse(UserBase):
    id: int
    profile_picture: Optional[str] = None
    preferred_ai_provider: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProfileBase(BaseModel):
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    current_title: Optional[str] = None
    years_of_experience: Optional[int] = None
    summary: Optional[str] = None


class ProfileCreate(ProfileBase):
    education: Optional[List[Dict]] = []
    work_experience: Optional[List[Dict]] = []
    skills: Optional[List[str]] = []
    languages: Optional[List[str]] = []
    certifications: Optional[List[str]] = []


class ProfileResponse(ProfileCreate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class JobBase(BaseModel):
    job_title: str
    company_name: str
    company_location: Optional[str] = None
    job_url: Optional[str] = None
    platform: Optional[str] = None


class JobCreate(JobBase):
    description: Optional[str] = None
    requirements: Optional[List[str]] = []
    responsibilities: Optional[List[str]] = []
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None


class JobResponse(JobCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ApplicationBase(BaseModel):
    job_id: int


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationResponse(ApplicationBase):
    id: int
    user_id: int
    status: str
    match_rate: Optional[float] = None
    created_at: datetime
    applied_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CoverLetterRequest(BaseModel):
    application_id: int


class CoverLetterResponse(BaseModel):
    cover_letter: str


class InterviewPrepResponse(BaseModel):
    id: int
    background_analysis: Optional[str] = None
    job_fit_analysis: Optional[str] = None
    development_plan: Optional[str] = None
    cultural_insights: Optional[str] = None
    common_questions: Optional[List[Dict]] = []
    behavioral_questions: Optional[List[Dict]] = []
    technical_questions: Optional[List[Dict]] = []
    interview_tips: Optional[List[str]] = []
    step_by_step_guide: Optional[List[Dict]] = []
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleAuthRequest(BaseModel):
    token: str


class JobSearchRequest(BaseModel):
    keyword: str = Field(..., min_length=2)
    location: Optional[str] = None
    platform: Optional[str] = None


class JobMatchResponse(BaseModel):
    match_rate: float
    pros: List[str]
    cons: List[str]
    assessment: str
