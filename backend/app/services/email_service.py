from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import os
import pickle
from typing import List, Dict
from datetime import datetime, timedelta


class EmailService:
    """Service for Gmail integration"""
    
    SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
    
    def __init__(self):
        self.creds = None
        self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Gmail API"""
        if os.path.exists('token.pickle'):
            with open('token.pickle', 'rb') as token:
                self.creds = pickle.load(token)
        
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    'credentials.json', self.SCOPES)
                self.creds = flow.run_local_server(port=0)
            
            with open('token.pickle', 'wb') as token:
                pickle.dump(self.creds, token)
    
    async def check_application_emails(
        self,
        user_email: str,
        company_name: str,
        days_back: int = 30
    ) -> List[Dict]:
        """Check for emails related to job application"""
        try:
            service = build('gmail', 'v1', credentials=self.creds)
            
            # Calculate date for search
            after_date = datetime.now() - timedelta(days=days_back)
            query = f'from:@{company_name} after:{after_date.strftime("%Y/%m/%d")}'
            
            results = service.users().messages().list(
                userId='me',
                q=query,
                maxResults=50
            ).execute()
            
            messages = results.get('messages', [])
            
            emails = []
            for message in messages:
                msg = service.users().messages().get(
                    userId='me',
                    id=message['id']
                ).execute()
                
                headers = msg['payload']['headers']
                subject = next(
                    (h['value'] for h in headers if h['name'] == 'Subject'),
                    'No Subject'
                )
                from_email = next(
                    (h['value'] for h in headers if h['name'] == 'From'),
                    'Unknown'
                )
                date = next(
                    (h['value'] for h in headers if h['name'] == 'Date'),
                    'Unknown'
                )
                
                emails.append({
                    'id': message['id'],
                    'subject': subject,
                    'from': from_email,
                    'date': date,
                    'snippet': msg['snippet']
                })
            
            return emails
        
        except Exception as e:
            print(f"Error checking emails: {str(e)}")
            return []
    
    async def get_email_content(self, message_id: str) -> str:
        """Get full content of an email"""
        try:
            service = build('gmail', 'v1', credentials=self.creds)
            message = service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()
            
            return message.get('snippet', '')
        
        except Exception as e:
            print(f"Error getting email content: {str(e)}")
            return ""