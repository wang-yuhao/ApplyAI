"""
PDF Generator Service - Complete Implementation with Motivation Letter
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from datetime import datetime
import os
import logging
from typing import Dict, List, Optional
from PyPDF2 import PdfMerger

logger = logging.getLogger(__name__)


class PDFGenerator:
    """Generate professional PDF documents"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        
        # Name/Title style
        if 'Name' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='Name',
                parent=self.styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#1a1a1a'),
                spaceAfter=6,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            ))
        
        # Contact info style
        if 'Contact' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='Contact',
                parent=self.styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#555555'),
                alignment=TA_CENTER,
                spaceAfter=12
            ))
        
        # Section heading style
        if 'SectionHeading' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='SectionHeading',
                parent=self.styles['Heading2'],
                fontSize=14,
                textColor=colors.HexColor('#2563eb'),
                spaceAfter=8,
                spaceBefore=12,
                fontName='Helvetica-Bold'
            ))
        
        # Job title style
        if 'JobTitle' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='JobTitle',
                parent=self.styles['Normal'],
                fontSize=11,
                textColor=colors.HexColor('#1a1a1a'),
                fontName='Helvetica-Bold',
                spaceAfter=2
            ))
        
        # Company/Institution style
        if 'Company' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='Company',
                parent=self.styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#555555'),
                spaceAfter=4
            ))
        
        # Body text style
        if 'CustomBody' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='CustomBody',
                parent=self.styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#333333'),
                spaceAfter=6,
                alignment=TA_JUSTIFY
            ))
    
    # ... (keep all existing functions: generate_resume, _build_header, etc.)
    
    def generate_motivation_letter_pdf(
        self,
        content: str,
        job_title: str,
        company_name: str,
        applicant_name: str,
        output_path: str
    ) -> str:
        """
        Generate motivation letter PDF
        
        Args:
            content: Motivation letter text
            job_title: Job position
            company_name: Company name
            applicant_name: Applicant's name
            output_path: Path where PDF will be saved
            
        Returns:
            str: Path to generated PDF
        """
        try:
            doc = SimpleDocTemplate(
                output_path,
                pagesize=letter,
                rightMargin=inch,
                leftMargin=inch,
                topMargin=inch,
                bottomMargin=inch
            )
            
            story = []
            
            # Header
            story.append(Paragraph(applicant_name, self.styles['Name']))
            story.append(Spacer(1, 0.2*inch))
            
            # Date
            date_str = datetime.now().strftime("%B %d, %Y")
            story.append(Paragraph(date_str, self.styles['CustomBody']))
            story.append(Spacer(1, 0.2*inch))
            
            # Company info
            story.append(Paragraph(company_name, self.styles['JobTitle']))
            story.append(Paragraph(f"Position: {job_title}", self.styles['Company']))
            story.append(Spacer(1, 0.3*inch))
            
            # Subject
            story.append(Paragraph(f"<b>Re: Application for {job_title}</b>", self.styles['CustomBody']))
            story.append(Spacer(1, 0.2*inch))
            
            # Content
            for paragraph in content.split('\n\n'):
                if paragraph.strip():
                    story.append(Paragraph(paragraph.strip(), self.styles['CustomBody']))
                    story.append(Spacer(1, 0.1*inch))
            
            # Build PDF
            doc.build(story)
            
            logger.info(f"✅ Motivation letter PDF generated: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Failed to generate motivation letter PDF: {str(e)}")
            raise
    
    def merge_pdfs(self, pdf_paths: List[str], output_path: str) -> str:
        """
        Merge multiple PDFs into single file
        
        Args:
            pdf_paths: List of PDF file paths to merge
            output_path: Path for merged PDF
            
        Returns:
            str: Path to merged PDF
        """
        try:
            merger = PdfMerger()
            
            # Add all PDFs in order
            for pdf_path in pdf_paths:
                if os.path.exists(pdf_path):
                    merger.append(pdf_path)
                    logger.info(f"Added to merge: {pdf_path}")
                else:
                    logger.warning(f"PDF not found, skipping: {pdf_path}")
            
            # Write merged PDF
            merger.write(output_path)
            merger.close()
            
            logger.info(f"✅ PDFs merged successfully: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Failed to merge PDFs: {str(e)}")
            raise
    def generate_resume(self, profile_data: Dict, output_path: str, template: str = "professional") -> str:
        """
        Generate resume PDF from profile data
        
        Args:
            profile_data: Dictionary containing all profile information
            output_path: Path where PDF will be saved
            template: Template name (professional, modern, classic)
            
        Returns:
            str: Path to generated PDF file
        """
        try:
            # Create PDF document
            doc = SimpleDocTemplate(
                output_path,
                pagesize=letter,
                rightMargin=0.75*inch,
                leftMargin=0.75*inch,
                topMargin=0.75*inch,
                bottomMargin=0.75*inch
            )
            
            # Build content
            story = []
            
            # Header with name and contact
            story.extend(self._build_header(profile_data))
            
            # Professional Summary
            if profile_data.get('professional_summary'):
                story.extend(self._build_summary(profile_data))
            
            # Work Experience
            if profile_data.get('work_experience'):
                story.extend(self._build_work_experience(profile_data))
            
            # Education
            if profile_data.get('education'):
                story.extend(self._build_education(profile_data))
            
            # Technical Skills
            if profile_data.get('technical_skills'):
                story.extend(self._build_skills(profile_data))
            
            # Projects
            if profile_data.get('projects'):
                story.extend(self._build_projects(profile_data))
            
            # Publications
            if profile_data.get('publications'):
                story.extend(self._build_publications(profile_data))
            
            # Certifications
            if profile_data.get('certifications'):
                story.extend(self._build_certifications(profile_data))
            
            # Awards
            if profile_data.get('awards_honors'):
                story.extend(self._build_awards(profile_data))
            
            # Languages
            if profile_data.get('languages'):
                story.extend(self._build_languages(profile_data))
            
            # Build PDF
            doc.build(story)
            
            logger.info(f"Resume PDF generated successfully: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to generate resume PDF: {str(e)}")
            raise
    
    def _build_header(self, data: Dict) -> List:
        """Build resume header with name and contact info"""
        elements = []
        
        # Name
        name = data.get('full_name', 'Your Name')
        elements.append(Paragraph(name, self.styles['Name']))
        
        # Contact information
        contact_parts = []
        
        if data.get('email'):
            contact_parts.append(data['email'])
        
        if data.get('phone'):
            contact_parts.append(data['phone'])
        
        if data.get('location'):
            contact_parts.append(data['location'])
        
        if contact_parts:
            contact_text = ' • '.join(contact_parts)
            elements.append(Paragraph(contact_text, self.styles['Contact']))
        
        # Links
        link_parts = []
        
        if data.get('linkedin_url'):
            link_parts.append(f'<a href="{data["linkedin_url"]}" color="blue">LinkedIn</a>')
        
        if data.get('github_url'):
            link_parts.append(f'<a href="{data["github_url"]}" color="blue">GitHub</a>')
        
        if data.get('personal_website'):
            link_parts.append(f'<a href="{data["personal_website"]}" color="blue">Website</a>')
        
        if link_parts:
            links_text = ' • '.join(link_parts)
            elements.append(Paragraph(links_text, self.styles['Contact']))
        
        elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _build_summary(self, data: Dict) -> List:
        """Build professional summary section"""
        elements = []
        
        elements.append(Paragraph("PROFESSIONAL SUMMARY", self.styles['SectionHeading']))
        elements.append(Paragraph(data['professional_summary'], self.styles['CustomBody']))
        elements.append(Spacer(1, 0.15*inch))
        
        return elements
    
    def _build_work_experience(self, data: Dict) -> List:
        """Build work experience section"""
        elements = []
        
        elements.append(Paragraph("WORK EXPERIENCE", self.styles['SectionHeading']))
        
        for exp in data['work_experience']:
            # Job title and dates
            title = exp.get('position', 'Position')
            company = exp.get('company', 'Company')
            dates = f"{exp.get('start_date', '')} - {exp.get('end_date', 'Present')}"
            
            elements.append(Paragraph(f"<b>{title}</b>", self.styles['JobTitle']))
            elements.append(Paragraph(f"{company} | {dates}", self.styles['Company']))
            
            # Responsibilities
            if exp.get('responsibilities'):
                for resp in exp['responsibilities'][:5]:  # Limit to 5
                    elements.append(Paragraph(f"• {resp}", self.styles['CustomBody']))
            
            elements.append(Spacer(1, 0.1*inch))
        
        return elements
    
    def _build_education(self, data: Dict) -> List:
        """Build education section"""
        elements = []
        
        elements.append(Paragraph("EDUCATION", self.styles['SectionHeading']))
        
        for edu in data['education']:
            degree = edu.get('degree', 'Degree')
            field = edu.get('field_of_study', '')
            institution = edu.get('institution', 'Institution')
            dates = f"{edu.get('start_date', '')} - {edu.get('end_date', '')}"
            
            degree_text = f"{degree} in {field}" if field else degree
            elements.append(Paragraph(f"<b>{degree_text}</b>", self.styles['JobTitle']))
            elements.append(Paragraph(f"{institution} | {dates}", self.styles['Company']))
            
            if edu.get('gpa'):
                elements.append(Paragraph(f"GPA: {edu['gpa']}", self.styles['CustomBody']))
            
            if edu.get('thesis_title'):
                elements.append(Paragraph(f"Thesis: {edu['thesis_title']}", self.styles['CustomBody']))
            
            elements.append(Spacer(1, 0.1*inch))
        
        return elements
    
    def _build_skills(self, data: Dict) -> List:
        """Build technical skills section"""
        elements = []
        
        skills = data['technical_skills']
        
        if not any(skills.values()):
            return elements
        
        elements.append(Paragraph("TECHNICAL SKILLS", self.styles['SectionHeading']))
        
        skill_categories = [
            ('Programming Languages', skills.get('programming_languages', [])),
            ('Frameworks', skills.get('frameworks', [])),
            ('Databases', skills.get('databases', [])),
            ('Tools', skills.get('tools', [])),
            ('Cloud Platforms', skills.get('cloud_platforms', [])),
        ]
        
        for category, items in skill_categories:
            if items:
                items_text = ', '.join(items)
                elements.append(Paragraph(f"<b>{category}:</b> {items_text}", self.styles['CustomBody']))
        
        elements.append(Spacer(1, 0.15*inch))
        
        return elements
    
    def _build_projects(self, data: Dict) -> List:
        """Build projects section"""
        elements = []
        
        elements.append(Paragraph("PROJECTS", self.styles['SectionHeading']))
        
        for proj in data['projects']:
            name = proj.get('project_name', 'Project')
            role = proj.get('role', '')
            
            title_text = f"{name} - {role}" if role else name
            elements.append(Paragraph(f"<b>{title_text}</b>", self.styles['JobTitle']))
            
            if proj.get('description'):
                elements.append(Paragraph(proj['description'], self.styles['CustomBody']))
            
            if proj.get('tools_and_skills'):
                tools = ', '.join(proj['tools_and_skills'])
                elements.append(Paragraph(f"Technologies: {tools}", self.styles['Company']))
            
            elements.append(Spacer(1, 0.1*inch))
        
        return elements
    
    def _build_publications(self, data: Dict) -> List:
        """Build publications section"""
        elements = []
        
        elements.append(Paragraph("PUBLICATIONS", self.styles['SectionHeading']))
        
        for pub in data['publications']:
            title = pub.get('title', 'Publication')
            publisher = pub.get('publisher', '')
            date = pub.get('publication_date', '')
            
            elements.append(Paragraph(f"<b>{title}</b>", self.styles['JobTitle']))
            
            pub_info = f"{publisher}, {date}" if publisher and date else publisher or date
            if pub_info:
                elements.append(Paragraph(pub_info, self.styles['Company']))
            
            if pub.get('doi'):
                elements.append(Paragraph(f"DOI: {pub['doi']}", self.styles['CustomBody']))
            
            elements.append(Spacer(1, 0.1*inch))
        
        return elements
    
    def _build_certifications(self, data: Dict) -> List:
        """Build certifications section"""
        elements = []
        
        elements.append(Paragraph("CERTIFICATIONS", self.styles['SectionHeading']))
        
        for cert in data['certifications']:
            name = cert.get('name', 'Certification')
            issuer = cert.get('issuing_organization', '')
            date = cert.get('issue_date', '')
            
            elements.append(Paragraph(f"<b>{name}</b>", self.styles['JobTitle']))
            
            cert_info = f"{issuer}, {date}" if issuer and date else issuer or date
            if cert_info:
                elements.append(Paragraph(cert_info, self.styles['Company']))
        
        elements.append(Spacer(1, 0.15*inch))
        
        return elements
    
    def _build_awards(self, data: Dict) -> List:
        """Build awards section"""
        elements = []
        
        elements.append(Paragraph("AWARDS & HONORS", self.styles['SectionHeading']))
        
        for award in data['awards_honors']:
            title = award.get('title', 'Award')
            issuer = award.get('issuer', '')
            date = award.get('date', '')
            
            elements.append(Paragraph(f"<b>{title}</b>", self.styles['JobTitle']))
            
            award_info = f"{issuer}, {date}" if issuer and date else issuer or date
            if award_info:
                elements.append(Paragraph(award_info, self.styles['Company']))
            
            if award.get('description'):
                elements.append(Paragraph(award['description'], self.styles['CustomBody']))
        
        elements.append(Spacer(1, 0.15*inch))
        
        return elements
    
    def _build_languages(self, data: Dict) -> List:
        """Build languages section"""
        elements = []
        
        elements.append(Paragraph("LANGUAGES", self.styles['SectionHeading']))
        
        lang_strings = []
        for lang in data['languages']:
            language = lang.get('language', '')
            proficiency = lang.get('proficiency', '')
            if language:
                lang_strings.append(f"{language} ({proficiency})")
        
        if lang_strings:
            elements.append(Paragraph(', '.join(lang_strings), self.styles['CustomBody']))
        
        elements.append(Spacer(1, 0.15*inch))
        
        return elements
    
    def generate_cover_letter(self, content: str, user_info: Dict, output_path: str) -> str:
        """
        Generate cover letter PDF
        
        Args:
            content: Cover letter text content
            user_info: User contact information
            output_path: Path where PDF will be saved
            
        Returns:
            str: Path to generated PDF
        """
        try:
            doc = SimpleDocTemplate(
                output_path,
                pagesize=letter,
                rightMargin=inch,
                leftMargin=inch,
                topMargin=inch,
                bottomMargin=inch
            )
            
            story = []
            
            # Header with contact info
            name = user_info.get('full_name', 'Your Name')
            story.append(Paragraph(name, self.styles['Name']))
            
            contact_parts = []
            if user_info.get('email'):
                contact_parts.append(user_info['email'])
            if user_info.get('phone'):
                contact_parts.append(user_info['phone'])
            
            if contact_parts:
                story.append(Paragraph(' • '.join(contact_parts), self.styles['Contact']))
            
            story.append(Spacer(1, 0.3*inch))
            
            # Date
            date_str = datetime.now().strftime("%B %d, %Y")
            story.append(Paragraph(date_str, self.styles['CustomBody']))
            story.append(Spacer(1, 0.2*inch))
            
            # Content
            for paragraph in content.split('\n\n'):
                if paragraph.strip():
                    story.append(Paragraph(paragraph.strip(), self.styles['CustomBody']))
                    story.append(Spacer(1, 0.1*inch))
            
            doc.build(story)
            
            logger.info(f"Cover letter PDF generated: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to generate cover letter PDF: {str(e)}")
            raise
    
    def merge_application_pdfs(
        self,
        resume_path: str,
        cover_letter_path: str,
        output_path: str
    ) -> str:
        """
        Merge resume and cover letter into single PDF
        
        Args:
            resume_path: Path to resume PDF
            cover_letter_path: Path to cover letter PDF
            output_path: Path for merged PDF
            
        Returns:
            str: Path to merged PDF
        """
        try:
            merger = PdfMerger()
            
            # Add cover letter first, then resume
            if os.path.exists(cover_letter_path):
                merger.append(cover_letter_path)
            
            if os.path.exists(resume_path):
                merger.append(resume_path)
            
            # Write merged PDF
            merger.write(output_path)
            merger.close()
            
            logger.info(f"Application PDFs merged: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to merge PDFs: {str(e)}")
            raise