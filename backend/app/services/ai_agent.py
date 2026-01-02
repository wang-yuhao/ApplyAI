"""
AI Agent Service - COMPLETE WITH MOTIVATION LETTER GENERATION
- Multi-provider support: NewAPI, OpenAI, Anthropic, Perplexity, Gemini
- Smart fallback system
- Rate limiting
- Comprehensive error handling
- Default models configured
"""

from typing import Dict, List, Optional, Union, Any
import openai
import anthropic
import httpx
import json
import logging
import asyncio
from functools import wraps
import time
import re

from app.config import settings

# ============================================================================
# IMPORT NEWAPI PROVIDER
# ============================================================================
try:
    from app.services.newapi_provider import NewAPIProvider
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning("NewAPIProvider not found, NewAPI support disabled")
    NewAPIProvider = None

logger = logging.getLogger(__name__)


# ============================================================================
# DEFAULT MODELS CONFIGURATION
# ============================================================================

DEFAULT_MODELS = {
    "newapi": "gpt-4o",  # Default model for NewAPI
    "openai": "gpt-4o",  # GPT-4o
    "anthropic": "claude-sonnet-4-20250514",  # Claude Sonnet 4.5
    "perplexity": "llama-3.1-sonar-large-128k-online",  # Sonar Pro
    "gemini": "gemini-2.0-flash-exp"  # Gemini 2.0 Flash
}


# ============================================================================
# Rate Limiting Decorator
# ============================================================================

class RateLimiter:
    """Simple rate limiter for AI API calls"""
    
    def __init__(self, calls_per_minute: int = 50):
        self.calls_per_minute = calls_per_minute
        self.calls = []
    
    def __call__(self, func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            now = time.time()
            self.calls = [call_time for call_time in self.calls if now - call_time < 60]
            
            if len(self.calls) >= self.calls_per_minute:
                wait_time = 60 - (now - self.calls[0])
                logger.warning(f"Rate limit reached, waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time)
            
            self.calls.append(time.time())
            return await func(*args, **kwargs)
        
        return wrapper


# ============================================================================
# AI Provider Base Class
# ============================================================================

class AIProviderBase:
    """Base class for AI providers"""
    
    def __init__(self, provider_name: str, config: dict):
        self.provider_name = provider_name
        self.config = config
        self.api_key = config.get("api_key")
        self.model = config.get("model") or DEFAULT_MODELS.get(provider_name.lower().replace(" ", ""))
        self.max_tokens = config.get("max_tokens", 4096)
        self.temperature = config.get("temperature", 0.7)
        self.timeout = config.get("timeout", 60)
    
    async def generate(self, prompt: str, **kwargs) -> str:
        raise NotImplementedError
    
    def log_request(self, prompt: str):
        logger.info(f"{self.provider_name} request | Model: {self.model} | Prompt: {len(prompt)} chars")
    
    def log_response(self, response: str, duration: float):
        logger.info(f"{self.provider_name} response | Length: {len(response)} chars | Duration: {duration:.2f}s")


# ============================================================================
# OpenAI Provider (GPT-4o)
# ============================================================================

class OpenAIProvider(AIProviderBase):
    """OpenAI GPT-4o provider"""
    
    def __init__(self, config: dict):
        super().__init__("OpenAI", config)
        self.client = openai.AsyncOpenAI(api_key=self.api_key, timeout=self.timeout)
        logger.info(f"✓ OpenAI initialized with model: {self.model}")
    
    @RateLimiter(calls_per_minute=50)
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        self.log_request(prompt)
        start_time = time.time()
        
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get("max_tokens", self.max_tokens),
                temperature=kwargs.get("temperature", self.temperature),
            )
            
            completion = response.choices[0].message.content
            duration = time.time() - start_time
            self.log_response(completion, duration)
            return completion
            
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            raise


# ============================================================================
# Anthropic Provider (Claude Sonnet 4.5)
# ============================================================================

class AnthropicProvider(AIProviderBase):
    """Anthropic Claude Sonnet 4.5 provider"""
    
    def __init__(self, config: dict):
        super().__init__("Anthropic", config)
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key, timeout=self.timeout)
        logger.info(f"✓ Anthropic initialized with model: {self.model}")
    
    @RateLimiter(calls_per_minute=50)
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        self.log_request(prompt)
        start_time = time.time()
        
        try:
            message_params = {
                "model": self.model,
                "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                "temperature": kwargs.get("temperature", self.temperature),
                "messages": [{"role": "user", "content": prompt}],
            }
            
            if system_prompt:
                message_params["system"] = system_prompt
            
            message = await self.client.messages.create(**message_params)
            completion = message.content[0].text
            duration = time.time() - start_time
            self.log_response(completion, duration)
            return completion
            
        except Exception as e:
            logger.error(f"Anthropic error: {str(e)}")
            raise


# ============================================================================
# Perplexity Provider (Sonar Pro)
# ============================================================================

class PerplexityProvider(AIProviderBase):
    """Perplexity Sonar Pro provider"""
    
    def __init__(self, config: dict):
        super().__init__("Perplexity", config)
        self.base_url = "https://api.perplexity.ai"
        self.client = httpx.AsyncClient(timeout=self.timeout)
        logger.info(f"✓ Perplexity initialized with model: {self.model}")
    
    @RateLimiter(calls_per_minute=50)
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        self.log_request(prompt)
        start_time = time.time()
        
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                "temperature": kwargs.get("temperature", self.temperature),
            }
            
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
            
            response.raise_for_status()
            data = response.json()
            completion = data["choices"][0]["message"]["content"]
            duration = time.time() - start_time
            self.log_response(completion, duration)
            return completion
            
        except Exception as e:
            logger.error(f"Perplexity error: {str(e)}")
            raise
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()


# ============================================================================
# Google Gemini Provider (Gemini 2.0)
# ============================================================================

class GeminiProvider(AIProviderBase):
    """Google Gemini 2.0 provider"""
    
    def __init__(self, config: dict):
        super().__init__("Google Gemini", config)
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.client = httpx.AsyncClient(timeout=self.timeout)
        logger.info(f"✓ Google Gemini initialized with model: {self.model}")
    
    @RateLimiter(calls_per_minute=50)
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        self.log_request(prompt)
        start_time = time.time()
        
        try:
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": kwargs.get("temperature", self.temperature),
                    "maxOutputTokens": kwargs.get("max_tokens", self.max_tokens),
                }
            }
            
            url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
            response = await self.client.post(url, json=payload, headers={"Content-Type": "application/json"})
            response.raise_for_status()
            data = response.json()
            
            completion = data["candidates"][0]["content"]["parts"][0]["text"]
            duration = time.time() - start_time
            self.log_response(completion, duration)
            return completion
            
        except Exception as e:
            logger.error(f"Gemini error: {str(e)}")
            raise
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()


# ============================================================================
# Main AI Agent Class - WITH MOTIVATION LETTER GENERATION
# ============================================================================

class AIAgent:
    """
    Main AI Agent with multi-provider support
    
    Supported Providers:
    - newapi: Access 50+ models through one API (if NewAPIProvider available)
    - openai: Direct OpenAI access (GPT-4o)
    - anthropic: Direct Anthropic access (Claude Sonnet 4.5)
    - perplexity: Web search capabilities (Sonar Pro)
    - gemini: Google AI access (Gemini 2.0)
    
    Features:
    - generate_motivation_letter: Create personalized cover letters
    - extract_resume_info: Parse resume data
    - calculate_job_match: Analyze job fit
    - generate_cover_letter: Create cover letters
    - generate_interview_preparation: Interview prep guides
    """
    
    def __init__(self, provider: Optional[str] = None):
        self.primary_provider = provider or settings.AI_PROVIDER
        self.providers = {}
        self.fallback_enabled = True
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize only available AI providers (those with API keys)"""
        
        # ========================================================================
        # NEWAPI - PRIORITY #1 (One API for all models!)
        # ========================================================================
        if NewAPIProvider and hasattr(settings, 'NEWAPI_API_KEY') and settings.NEWAPI_API_KEY:
            try:
                config = settings.get_ai_config("newapi")
                if config.get("api_key"):
                    # Set default model if not specified
                    if not config.get("model"):
                        config["model"] = DEFAULT_MODELS["newapi"]
                    self.providers["newapi"] = NewAPIProvider(config)
                    logger.info("✅ NewAPI provider initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize NewAPI: {str(e)}")
        
        # OpenAI GPT-4o
        if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
            try:
                config = settings.get_ai_config("openai")
                if config.get("api_key"):
                    if not config.get("model"):
                        config["model"] = DEFAULT_MODELS["openai"]
                    self.providers["openai"] = OpenAIProvider(config)
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI: {str(e)}")
        
        # Anthropic Claude Sonnet 4.5
        if hasattr(settings, 'ANTHROPIC_API_KEY') and settings.ANTHROPIC_API_KEY:
            try:
                config = settings.get_ai_config("anthropic")
                if config.get("api_key"):
                    if not config.get("model"):
                        config["model"] = DEFAULT_MODELS["anthropic"]
                    self.providers["anthropic"] = AnthropicProvider(config)
            except Exception as e:
                logger.warning(f"Failed to initialize Anthropic: {str(e)}")
        
        # Perplexity Sonar Pro
        if hasattr(settings, 'PERPLEXITY_API_KEY') and settings.PERPLEXITY_API_KEY:
            try:
                config = settings.get_ai_config("perplexity")
                if config.get("api_key"):
                    if not config.get("model"):
                        config["model"] = DEFAULT_MODELS["perplexity"]
                    self.providers["perplexity"] = PerplexityProvider(config)
            except Exception as e:
                logger.warning(f"Failed to initialize Perplexity: {str(e)}")
        
        # Google Gemini 2.0
        if hasattr(settings, 'GOOGLE_GEMINI_API_KEY') and settings.GOOGLE_GEMINI_API_KEY:
            try:
                config = settings.get_ai_config("gemini")
                if config.get("api_key"):
                    if not config.get("model"):
                        config["model"] = DEFAULT_MODELS["gemini"]
                    self.providers["gemini"] = GeminiProvider(config)
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini: {str(e)}")
        
        if self.providers:
            logger.info(f"✓ Initialized {len(self.providers)} AI provider(s): {', '.join(self.providers.keys())}")
        else:
            logger.warning("⚠️  No AI providers available - will use fallback methods only")
        
        # Adjust primary provider if not available
        if self.primary_provider not in self.providers and self.providers:
            old_provider = self.primary_provider
            self.primary_provider = list(self.providers.keys())[0]
            logger.warning(
                f"Primary provider '{old_provider}' not available, "
                f"using '{self.primary_provider}' instead"
            )
    
    def is_available(self) -> bool:
        """Check if any AI service is available"""
        return len(self.providers) > 0
    
    async def generate_completion(
        self,
        prompt: str,
        provider: Optional[str] = None,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate completion with fallback support"""
        
        # If no providers available, raise error
        if not self.providers:
            logger.error("No AI providers available")
            raise ValueError("No AI providers configured. Please set at least one API key.")
        
        provider_name = provider or self.primary_provider
        
        if not self.fallback_enabled:
            return await self._generate_with_provider(provider_name, prompt, system_prompt, **kwargs)
        
        # Try with fallback
        providers_to_try = [provider_name]
        if hasattr(settings, 'AI_FALLBACK_ORDER'):
            providers_to_try += [
                p for p in settings.AI_FALLBACK_ORDER 
                if p != provider_name and p in self.providers
            ]
        else:
            # Default fallback order
            providers_to_try += [p for p in self.providers.keys() if p != provider_name]
        
        last_error = None
        for prov in providers_to_try:
            if prov not in self.providers:
                continue
            
            try:
                return await self._generate_with_provider(prov, prompt, system_prompt, **kwargs)
            except Exception as e:
                logger.warning(f"Provider {prov} failed: {str(e)}")
                last_error = e
                continue
        
        # All providers failed
        logger.error(f"All AI providers failed. Last error: {last_error}")
        raise Exception(f"All AI providers failed. Last error: {last_error}")
    
    async def _generate_with_provider(
        self,
        provider: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate with specific provider"""
        if provider not in self.providers:
            raise ValueError(f"Provider '{provider}' not available. Available: {list(self.providers.keys())}")
        
        provider_instance = self.providers[provider]
        return await provider_instance.generate(prompt, system_prompt, **kwargs)
    
    # ========================================================================
    # MOTIVATION LETTER GENERATION (NEW)
    # ========================================================================
    
    async def generate_motivation_letter(
        self,
        job_data: Dict[str, Any],
        profile_data: Dict[str, Any],
        user_email: str,
        template_content: Optional[str] = None
    ) -> str:
        """
        Generate motivation letter for a job application
        
        Args:
            job_data: Job information (title, company, description, requirements)
            profile_data: User profile data (experience, education, skills)
            user_email: User's email address
            template_content: Optional template letter to match style
            
        Returns:
            Generated motivation letter text
            
        Features:
            - Uses template style matching if provided
            - Uses ONLY real user data
            - NO fake data generation
            - Professional, polite tone
        """
        if not self.is_available():
            raise Exception("AI service not available. Set at least one API key.")
        
        # Build comprehensive prompt
        prompt = self._build_motivation_letter_prompt(
            job_data=job_data,
            profile_data=profile_data,
            user_email=user_email,
            template_content=template_content
        )
        
        logger.info(f"🤖 Generating letter for {job_data.get('job_title')} at {job_data.get('company_name')}")
        if template_content:
            logger.info("📋 Using template style matching")
        
        # Generate letter
        letter_text = await self.generate_completion(
            prompt,
            system_prompt=None,  # Prompt is self-contained
            temperature=0.7,
            max_tokens=2000
        )
        
        logger.info(f"✅ Generated letter ({len(letter_text)} chars, {len(letter_text.split())} words)")
        
        return letter_text.strip()
    
    def _build_motivation_letter_prompt(
        self,
        job_data: Dict[str, Any],
        profile_data: Dict[str, Any],
        user_email: str,
        template_content: Optional[str] = None
    ) -> str:
        """
        Build comprehensive prompt for motivation letter generation
        
        Returns:
            Complete prompt string
        """
        prompt = f"""Generate a professional motivation letter for the following job application.

=== JOB INFORMATION ===
Job Title: {job_data.get('job_title', 'Not specified')}
Company: {job_data.get('company_name', 'Not specified')}
Location: {job_data.get('company_location', 'Not specified')}

Job Description:
{job_data.get('description', 'No description provided')}

"""
        
        # Add job requirements if available
        requirements = job_data.get('requirements', [])
        if requirements:
            prompt += "Job Requirements:\n"
            prompt += "\n".join(f"- {req}" for req in requirements)
            prompt += "\n\n"
        
        # Add applicant information
        prompt += f"""=== APPLICANT INFORMATION (USE ONLY THIS DATA) ===
Name: {profile_data.get('full_name', 'Not provided')}
Email: {user_email}
Current Position: {profile_data.get('current_title', 'Not provided')}
Years of Experience: {profile_data.get('years_of_experience', 0)}
Location: {profile_data.get('location', 'Not provided')}

Professional Summary:
{profile_data.get('professional_summary', 'Not provided')}

Work Experience:
"""
        
        # Add work experience
        work_experience = profile_data.get('work_experience', [])
        for i, exp in enumerate(work_experience[:3], 1):
            prompt += f"\n{i}. {exp.get('position', 'Position')} at {exp.get('company', 'Company')}"
            prompt += f"\n   Duration: {exp.get('start_date', '')} to {exp.get('end_date', 'Present')}"
            
            responsibilities = exp.get('responsibilities', [])
            if responsibilities:
                # Limit to 2 key responsibilities
                key_resp = responsibilities[:2]
                prompt += f"\n   Key achievements: {', '.join(key_resp)}"
        
        # Add education
        education = profile_data.get('education', [])
        if education:
            prompt += "\n\nEducation:\n"
            for i, edu in enumerate(education[:2], 1):
                degree = edu.get('degree', 'Degree')
                field = edu.get('field_of_study', 'Field')
                institution = edu.get('institution', 'Institution')
                prompt += f"{i}. {degree} in {field} from {institution}\n"
        
        # Add skills
        skills = profile_data.get('technical_skills', {})
        if skills:
            all_skills = []
            for skill_category, skill_list in skills.items():
                if isinstance(skill_list, list):
                    all_skills.extend(skill_list[:3])  # Top 3 from each category
            
            if all_skills:
                prompt += f"\nKey Skills: {', '.join(all_skills[:10])}\n"
        
        # Add projects if available
        projects = profile_data.get('projects', [])
        if projects:
            prompt += "\n\nKey Projects:\n"
            for i, proj in enumerate(projects[:2], 1):
                name = proj.get('project_name', 'Project')
                desc = proj.get('description', '')[:100]
                prompt += f"{i}. {name}: {desc}...\n"
        
        # Add certifications if available
        certifications = profile_data.get('training_certifications', [])
        if certifications:
            prompt += "\n\nCertifications:\n"
            for i, cert in enumerate(certifications[:3], 1):
                prompt += f"{i}. {cert.get('name', 'Certification')}\n"
        
        # Add template matching instructions if provided
        if template_content:
            prompt += f"""

=== TEMPLATE LETTER TO MATCH ===
{template_content}

=== CRITICAL STYLE MATCHING INSTRUCTIONS ===
1. MATCH THE TONE: Use the same tone, formality level, and writing style as the template
2. MATCH THE FORMAT: Follow the same paragraph structure and flow as the template
3. MATCH THE LANGUAGE: Use similar vocabulary, sentence complexity, and phrasing style
4. MATCH THE LENGTH: Aim for similar length (~300-400 words like the template)
5. PRESERVE PROFESSIONALISM: Keep the same level of politeness and professionalism

HOWEVER:
- DO NOT copy specific phrases verbatim from the template
- DO NOT reuse the template's specific examples or achievements
- Use ONLY the applicant's real data provided above
- Adapt the style to the NEW job and company
"""
        else:
            prompt += """

=== GENERATION INSTRUCTIONS ===
1. Write in professional, polite, and engaging tone
2. Keep concise (~300-400 words)
3. Include specific examples from applicant's experience
4. Show enthusiasm for the role and company
5. Highlight how applicant's background fits the role
"""
        
        # Universal requirements (always included)
        prompt += """

=== ABSOLUTE REQUIREMENTS ===
✅ USE ONLY the applicant's real data provided above
✅ Make specific references to applicant's actual experience
✅ Connect applicant's background to the job requirements
✅ Be professional, polite, and confident
✅ Show genuine interest in the role and company

❌ DO NOT invent or fabricate any experience, skills, or achievements
❌ DO NOT use generic placeholder text
❌ DO NOT include data not present in the applicant information
❌ DO NOT make assumptions about the applicant
❌ DO NOT use clichés or overly common phrases

Output ONLY the motivation letter text. Do not include any preamble, explanations, or metadata.
Start with the greeting (e.g., "Dear Hiring Manager,") and end with the closing (e.g., "Sincerely,").
"""
        
        return prompt
    
    # ========================================================================
    # Resume Extraction
    # ========================================================================
    
    async def extract_resume_info(self, resume_text: str) -> Dict:
        """Extract comprehensive information from resume with fallback"""
        
        system_prompt = (
            "You are an expert at parsing resumes. Extract all relevant information "
            "accurately and return ONLY valid JSON."
        )
        
        prompt = f"""
Extract structured information from this resume.

RESUME TEXT:
{resume_text[:8000]}

Return ONLY valid JSON with these fields:
{{
    "personal_info": {{
        "full_name": "<string>",
        "gender": "<male|female|non_binary|null>",
        "email": "<string>",
        "phone": "<string>",
        "location": "<string>",
        "linkedin_url": "<string or null>",
        "github_url": "<string or null>",
        "personal_website": "<string or null>",
        "current_title": "<string>",
        "years_of_experience": <integer>,
        "professional_summary": "<string>"
    }},
    "work_experience": [
        {{
            "company": "<string>",
            "position": "<string>",
            "location": "<string>",
            "start_date": "<YYYY-MM>",
            "end_date": "<YYYY-MM or Present>",
            "responsibilities": ["<string>"],
            "skills": ["<string>"],
            "achievements": ["<string>"]
        }}
    ],
    "education": [
        {{
            "institution": "<string>",
            "location": "<string>",
            "degree": "<string>",
            "field_of_study": "<string>",
            "start_date": "<YYYY>",
            "end_date": "<YYYY>",
            "gpa": "<string or null>",
            "thesis_title": "<string or null>",
            "summary": "<string or null>"
        }}
    ],
    "projects": [
        {{
            "project_name": "<string>",
            "role": "<string>",
            "tools_and_skills": ["<string>"],
            "description": "<string>",
            "url": "<string or null>"
        }}
    ],
    "technical_skills": {{
        "programming_languages": ["<string>"],
        "frameworks": ["<string>"],
        "databases": ["<string>"],
        "tools": ["<string>"],
        "cloud_platforms": ["<string>"],
        "soft_skills": ["<string>"]
    }},
    "languages": [
        {{
            "language": "<string>",
            "proficiency": "<Native|Fluent|Professional|Conversational|Basic>"
        }}
    ],
    "training_certifications": [
        {{
            "name": "<string>",
            "issuing_organization": "<string>",
            "issue_date": "<YYYY-MM>",
            "url": "<string or null>"
        }}
    ],
    "publications": [
        {{
            "title": "<string>",
            "publication_type": "<string>",
            "publisher": "<string>",
            "publication_date": "<YYYY-MM>",
            "doi": "<string or null>"
        }}
    ],
    "awards_honors": [
        {{
            "title": "<string>",
            "issuer": "<string>",
            "date": "<YYYY-MM>",
            "description": "<string>"
        }}
    ],
    "online_courses": [
        {{
            "course_name": "<string>",
            "platform": "<string>",
            "completion_date": "<YYYY-MM>"
        }}
    ],
    "volunteer_work": [
        {{
            "organization": "<string>",
            "role": "<string>",
            "start_date": "<YYYY-MM>",
            "end_date": "<YYYY-MM or Present>",
            "description": "<string>"
        }}
    ]
}}

Extract all available information. Use null for missing fields.
"""
        
        try:
            response = await self.generate_completion(
                prompt,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=8000
            )
            
            # Clean JSON response
            response = self._clean_json_response(response)
            extracted_info = json.loads(response)
            return extracted_info
            
        except json.JSONDecodeError as e:
            logger.error(f"Resume extraction JSON parse error: {str(e)}")
            # Try basic regex extraction as fallback
            return self._fallback_resume_extraction(resume_text)
        except Exception as e:
            logger.error(f"Resume extraction failed: {str(e)}")
            return self._fallback_resume_extraction(resume_text)
    
    def _fallback_resume_extraction(self, resume_text: str) -> Dict:
        """Fallback: Extract basic info using regex when AI fails"""
        logger.info("Using fallback resume extraction (regex-based)")
        
        extracted = self._get_empty_extraction()
        
        # Extract email
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)
        if email_match:
            extracted["personal_info"]["email"] = email_match.group(0)
        
        # Extract phone
        phone_match = re.search(r'[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}', resume_text)
        if phone_match:
            extracted["personal_info"]["phone"] = phone_match.group(0)
        
        # Extract name (first line, typically)
        lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
        if lines:
            extracted["personal_info"]["full_name"] = lines[0]
        
        # Extract URLs
        linkedin_match = re.search(r'linkedin\.com/in/[\w-]+', resume_text, re.IGNORECASE)
        if linkedin_match:
            extracted["personal_info"]["linkedin_url"] = f"https://{linkedin_match.group(0)}"
        
        github_match = re.search(r'github\.com/[\w-]+', resume_text, re.IGNORECASE)
        if github_match:
            extracted["personal_info"]["github_url"] = f"https://{github_match.group(0)}"
        
        # Extract common programming languages
        languages = ['Python', 'JavaScript', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'TypeScript', 'PHP', 'Swift', 'Kotlin']
        found_languages = [lang for lang in languages if lang.lower() in resume_text.lower()]
        extracted["technical_skills"]["programming_languages"] = found_languages
        
        logger.info(f"Fallback extraction completed: found {len(found_languages)} programming languages")
        return extracted
    
    def _get_empty_extraction(self) -> Dict:
        """Return empty extraction structure"""
        return {
            "personal_info": {
                "full_name": "",
                "gender": None,
                "email": "",
                "phone": "",
                "location": "",
                "linkedin_url": None,
                "github_url": None,
                "personal_website": None,
                "current_title": "",
                "years_of_experience": 0,
                "professional_summary": ""
            },
            "work_experience": [],
            "education": [],
            "projects": [],
            "technical_skills": {
                "programming_languages": [],
                "frameworks": [],
                "databases": [],
                "tools": [],
                "cloud_platforms": [],
                "soft_skills": []
            },
            "languages": [],
            "training_certifications": [],
            "publications": [],
            "awards_honors": [],
            "online_courses": [],
            "volunteer_work": []
        }
    
    # ========================================================================
    # Job Matching
    # ========================================================================
    
    async def calculate_job_match(self, user_profile: Dict, job_description: Dict) -> Dict:
        """Calculate match rate between user and job with fallback"""
        
        system_prompt = (
            "You are an expert career counselor. Analyze job matches objectively "
            "and provide actionable insights in JSON format."
        )
        
        # Extract skills for matching
        user_skills = []
        if user_profile.get('technical_skills'):
            for skill_category in user_profile['technical_skills'].values():
                if isinstance(skill_category, list):
                    user_skills.extend(skill_category)
        
        prompt = f"""
Analyze the match between this candidate and job.

CANDIDATE:
- Experience: {user_profile.get('years_of_experience', 0)} years
- Title: {user_profile.get('current_title', 'N/A')}
- Skills: {', '.join(user_skills[:15])}
- Education: {json.dumps(user_profile.get('education', [])[:2])}

JOB:
- Title: {job_description.get('job_title')}
- Company: {job_description.get('company_name')}
- Requirements: {json.dumps(job_description.get('requirements', [])[:5])}
- Description: {job_description.get('description', '')[:500]}

Return ONLY valid JSON:
{{
    "match_rate": <float 0-100>,
    "pros": [<3-5 strengths>],
    "cons": [<3-5 gaps>],
    "assessment": "<2-3 sentence summary>",
    "recommendations": [<3 specific tips>]
}}
"""
        
        try:
            response = await self.generate_completion(
                prompt, 
                system_prompt=system_prompt, 
                temperature=0.5,
                max_tokens=2000
            )
            
            response = self._clean_json_response(response)
            result = json.loads(response)
            return result
            
        except Exception as e:
            logger.error(f"AI job matching failed, using keyword fallback: {str(e)}")
            return self._fallback_job_match(user_skills, job_description)
    
    def _fallback_job_match(self, user_skills: List[str], job_description: Dict) -> Dict:
        """Fallback: Simple keyword matching when AI fails"""
        logger.info("Using fallback job matching (keyword-based)")
        
        job_text = f"{job_description.get('job_title', '')} {job_description.get('description', '')} {' '.join(job_description.get('requirements', []))}"
        job_text_lower = job_text.lower()
        
        # Normalize skills
        user_skills_lower = [s.lower() for s in user_skills if s]
        
        # Find matching skills
        matching_skills = [skill for skill in user_skills if skill.lower() in job_text_lower]
        
        # Calculate simple match rate
        if user_skills_lower:
            match_rate = min(100, (len(matching_skills) / len(user_skills_lower)) * 100)
        else:
            match_rate = 0
        
        # Boost for experience level
        if 'senior' in job_text_lower or 'lead' in job_text_lower:
            match_rate = max(0, match_rate - 10)  # Harder to match senior roles
        
        return {
            "match_rate": round(match_rate, 1),
            "pros": matching_skills[:5] if matching_skills else ["Consider applying to build experience"],
            "cons": ["Detailed analysis unavailable - AI service temporarily unavailable"],
            "assessment": f"Basic keyword matching found {len(matching_skills)} matching skills. Detailed analysis requires AI service.",
            "recommendations": [
                "Review job requirements carefully",
                "Highlight relevant experience in your application",
                "Research the company culture"
            ]
        }
    
    # ========================================================================
    # Cover Letter Generation
    # ========================================================================
    
    async def generate_cover_letter(
        self,
        user_profile: Dict,
        job_info: Dict,
        previous_template: Optional[str] = None
    ) -> str:
        """Generate tailored cover letter"""
        
        system_prompt = (
            "You are a professional career consultant. Create compelling, "
            "personalized cover letters that highlight candidates' strengths."
        )
        
        template_instruction = ""
        if previous_template:
            template_instruction = f"\n\nSTYLE REFERENCE (match this tone):\n{previous_template[:1000]}"
        
        prompt = f"""
Create a professional cover letter.

CANDIDATE:
- Name: {user_profile.get('full_name')}
- Title: {user_profile.get('current_title')}
- Experience: {user_profile.get('years_of_experience')} years
- Education: {user_profile.get('education', [{}])[0].get('degree', 'N/A')}

JOB:
- Position: {job_info.get('job_title')}
- Company: {job_info.get('company_name')}
- Requirements: {json.dumps(job_info.get('requirements', [])[:5])}
{template_instruction}

REQUIREMENTS:
- Professional business letter format
- Maximum 400 words
- Show enthusiasm
- Specific examples

Generate the cover letter:
"""
        
        try:
            cover_letter = await self.generate_completion(
                prompt,
                system_prompt=system_prompt,
                temperature=0.8,
                max_tokens=2000
            )
            return cover_letter.strip()
        except Exception as e:
            logger.error(f"Cover letter generation failed: {str(e)}")
            raise
    
    # ========================================================================
    # Interview Preparation
    # ========================================================================
    
    async def generate_interview_preparation(
        self,
        user_profile: Dict,
        job_info: Dict,
        company_culture: Optional[Dict] = None
    ) -> Dict:
        """Generate comprehensive interview preparation guide"""
        
        system_prompt = (
            "You are a senior career coach. Provide detailed, actionable interview "
            "guidance with step-by-step instructions."
        )
        
        prompt = f"""
Create a comprehensive interview preparation guide.

CANDIDATE:
- Name: {user_profile.get('full_name')}
- Title: {user_profile.get('current_title')}
- Experience: {user_profile.get('years_of_experience')} years

JOB:
- Position: {job_info.get('job_title')}
- Company: {job_info.get('company_name')}

Provide detailed interview preparation with practical examples.
"""
        
        try:
            response = await self.generate_completion(
                prompt,
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=6000
            )
            
            return {
                "background_analysis": response[:1000],
                "job_fit_analysis": response,
                "step_by_step_guide": [],
                "common_questions": [],
                "behavioral_questions": [],
                "technical_questions": [],
                "cultural_insights": "",
                "development_plan": ""
            }
        except Exception as e:
            logger.error(f"Interview prep failed: {str(e)}")
            raise
    
    # ========================================================================
    # Utility Methods
    # ========================================================================
    
    def _clean_json_response(self, response: str) -> str:
        """Clean JSON from AI response (remove markdown, etc.)"""
        response = response.strip()
        
        # Remove markdown code blocks
        if response.startswith("```json"):
            response = response[7:]
        elif response.startswith("```"):
            response = response[3:]
        
        if response.endswith("```"):
            response = response[:-3]
        
        return response.strip()
    
    async def find_original_application_url(
        self,
        job_title: str,
        company_name: str,
        job_description: str,
        platform_url: Optional[str] = None
    ) -> Optional[str]:
        """Find original application URL using AI"""
        
        if not self.providers:
            logger.warning("No AI providers available for URL finding")
            return None
        
        try:
            prompt = f"""
Find the direct application URL for this job posting.

Job Title: {job_title}
Company: {company_name}
Platform URL: {platform_url}
Description: {job_description[:500]}

Return ONLY the direct application URL or "NOT_FOUND" if uncertain.
"""
            
            response = await self.generate_completion(
                prompt, 
                temperature=0.3, 
                max_tokens=200
            )
            url = response.strip()
            
            if url and url != "NOT_FOUND" and url.startswith("http"):
                return url
            return None
            
        except Exception as e:
            logger.error(f"URL finding failed: {str(e)}")
            return None