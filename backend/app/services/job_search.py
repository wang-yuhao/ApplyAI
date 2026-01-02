"""
Job Search Service - COMPLETE with LinkedIn Pagination & Last Search Cache
Keeps original structure, adds pagination, better headers, and search caching
"""

from typing import List, Dict, Optional, AsyncGenerator
import httpx
from bs4 import BeautifulSoup
import asyncio
from datetime import datetime, timedelta
import logging
import re
from urllib.parse import urljoin, quote_plus
import json

logger = logging.getLogger(__name__)


class JobSearchService:
    """Optimized service for searching jobs with progressive loading and caching"""
    
    def __init__(self):
        self.cache = {}  # Simple in-memory cache
        self.cache_ttl = 300  # 5 minutes
        self.last_search = {}  # Store last search per keyword
        
        # Enhanced headers to avoid 403 errors
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
        
        self.platforms = {
            "linkedin": {
                "name": "LinkedIn",
                "url": "https://www.linkedin.com/jobs/search",
                "search_func": self._search_linkedin,
                "category": "General"
            },
            "indeed": {
                "name": "Indeed",
                "url": "https://www.indeed.com/jobs",
                "search_func": self._search_indeed,
                "category": "General"
            },
            "glassdoor": {
                "name": "Glassdoor",
                "url": "https://www.glassdoor.com/Job",
                "search_func": self._search_glassdoor,
                "category": "General"
            },
            "academic_positions": {
                "name": "Academic Positions",
                "url": "https://academicpositions.com/find-jobs",
                "search_func": self._search_academic_positions,
                "category": "Academic"
            },
            "euraxess": {
                "name": "EURAXESS",
                "url": "https://euraxess.ec.europa.eu/jobs/search",
                "search_func": self._search_euraxess,
                "category": "Academic"
            },
            "academic_transfer": {
                "name": "Academic Transfer",
                "url": "https://www.academictransfer.com/en/jobs",
                "search_func": self._search_academic_transfer,
                "category": "Academic"
            }
        }
    
    def get_last_search(self, keyword: str) -> Optional[Dict]:
        """Get results from last search for this keyword"""
        if keyword in self.last_search:
            cached_data, cached_time = self.last_search[keyword]
            if datetime.now().timestamp() - cached_time < self.cache_ttl:
                logger.info(f"✅ Returning last search results for: {keyword}")
                return {
                    "jobs": cached_data,
                    "cached": True,
                    "cached_at": datetime.fromtimestamp(cached_time).isoformat()
                }
        return None
    
    async def search_jobs_progressive(
        self,
        keyword: str,
        location: Optional[str] = None,
        platforms: Optional[List[str]] = None,
        max_results_per_platform: int = 20
    ) -> AsyncGenerator[Dict, None]:
        """
        Search jobs with progressive loading - yield results as they arrive
        
        Args:
            keyword: Search keyword
            location: Location filter
            platforms: List of platforms to search
            max_results_per_platform: Max results per platform
            
        Yields:
            Individual job dictionaries as they're found
        """
        if platforms is None:
            platforms = list(self.platforms.keys())
        
        # Check cache first
        cache_key = f"{keyword}:{location}:{','.join(sorted(platforms))}"
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if datetime.now().timestamp() - cached_time < self.cache_ttl:
                logger.info(f"✅ Returning cached results for: {keyword}")
                for job in cached_data:
                    yield job
                return
        
        valid_platforms = [p for p in platforms if p in self.platforms]
        
        if not valid_platforms:
            logger.warning(f"⚠️ No valid platforms in: {platforms}")
            return
        
        logger.info(f"🔍 Searching on platforms: {valid_platforms}")
        
        # Create tasks for all platforms
        tasks = []
        for platform in valid_platforms:
            search_func = self.platforms[platform]["search_func"]
            task = asyncio.create_task(
                search_func(keyword, location, max_results_per_platform)
            )
            tasks.append((platform, task))
        
        # Yield results as they complete (progressive loading)
        all_jobs = []
        for platform, task in tasks:
            try:
                jobs = await task
                for job in jobs:
                    all_jobs.append(job)
                    yield job  # Progressive yield
            except Exception as e:
                logger.error(f"❌ Platform {platform} failed: {str(e)}")
        
        # Cache results
        self.cache[cache_key] = (all_jobs, datetime.now().timestamp())
        # Store as last search for this keyword
        self.last_search[keyword] = (all_jobs, datetime.now().timestamp())
    
    async def search_jobs(
        self,
        keyword: str,
        location: Optional[str] = None,
        platforms: Optional[List[str]] = None,
        max_results_per_platform: int = 20
    ) -> List[Dict]:
        """
        Standard search that returns all results at once
        """
        results = []
        async for job in self.search_jobs_progressive(keyword, location, platforms, max_results_per_platform):
            results.append(job)
        return results
    
    # ========================================================================
    # REAL SEARCH IMPLEMENTATIONS - FIXED
    # ========================================================================
    
    async def _search_linkedin(
        self,
        keyword: str,
        location: Optional[str],
        max_results: int
    ) -> List[Dict]:
        """
        Search LinkedIn with PAGINATION - fetches up to max_results
        LinkedIn returns 10 jobs per page, so we need multiple requests
        """
        logger.info(f"🔍 Searching LinkedIn for: {keyword}")
        
        jobs = []
        jobs_per_page = 10
        num_pages = (max_results + jobs_per_page - 1) // jobs_per_page  # Round up
        
        logger.info(f"📄 Fetching {num_pages} pages for up to {max_results} jobs")
        
        try:
            async with httpx.AsyncClient(timeout=15.0, headers=self.headers) as client:
                # Fetch multiple pages in parallel
                tasks = []
                for page in range(num_pages):
                    start = page * jobs_per_page
                    task = self._fetch_linkedin_page(client, keyword, location, start)
                    tasks.append(task)
                
                # Execute all page requests in parallel
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Combine results
                for page_num, result in enumerate(results):
                    if isinstance(result, Exception):
                        logger.error(f"❌ LinkedIn page {page_num} failed: {result}")
                        continue
                    
                    if result:
                        logger.info(f"✅ LinkedIn page {page_num}: {len(result)} jobs")
                        jobs.extend(result)
                
                # Deduplicate by URL
                seen_urls = set()
                unique_jobs = []
                for job in jobs:
                    if job['job_url'] not in seen_urls:
                        seen_urls.add(job['job_url'])
                        unique_jobs.append(job)
                
                jobs = unique_jobs[:max_results]
                    
        except Exception as e:
            logger.error(f"❌ LinkedIn search failed: {e}")
        
        logger.info(f"✅ LinkedIn total: {len(jobs)} unique jobs")
        return jobs
    
    async def _fetch_linkedin_page(
        self,
        client: httpx.AsyncClient,
        keyword: str,
        location: Optional[str],
        start: int
    ) -> List[Dict]:
        """Fetch a single page of LinkedIn results"""
        try:
            search_url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={quote_plus(keyword)}&location={quote_plus(location or '')}&start={start}"
            
            response = await client.get(search_url, follow_redirects=True)
            
            if response.status_code != 200:
                logger.warning(f"⚠️ LinkedIn returned {response.status_code} for start={start}")
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            job_cards = soup.find_all('li')
            
            jobs = []
            for card in job_cards:
                try:
                    title_elem = card.find('h3', class_='base-search-card__title')
                    company_elem = card.find('h4', class_='base-search-card__subtitle')
                    location_elem = card.find('span', class_='job-search-card__location')
                    link_elem = card.find('a', class_='base-card__full-link')
                    
                    if title_elem and company_elem and link_elem:
                        job_url = link_elem.get('href', '')
                        
                        jobs.append({
                            "platform": "linkedin",
                            "platform_name": "LinkedIn",
                            "job_title": title_elem.text.strip(),
                            "company_name": company_elem.text.strip(),
                            "company_location": location_elem.text.strip() if location_elem else location or "Not specified",
                            "job_url": job_url,
                            "platform_job_url": job_url,
                            "description": f"Position at {company_elem.text.strip()}",
                            "requirements": [],
                            "employment_type": "full-time",
                            "experience_level": "mid",
                            "remote_option": 'remote' in (location_elem.text.lower() if location_elem else ''),
                            "posted_date": datetime.now().isoformat()
                        })
                except Exception as e:
                    logger.debug(f"Error parsing LinkedIn job card: {e}")
                    continue
            
            return jobs
            
        except httpx.RequestError as e:
            logger.error(f"❌ LinkedIn page request failed (start={start}): {e}")
            return []
    
    async def _search_indeed(
        self,
        keyword: str,
        location: Optional[str],
        max_results: int
    ) -> List[Dict]:
        """Search Indeed with improved headers to avoid 403"""
        logger.info(f"🔍 Searching Indeed for: {keyword}")
        
        jobs = []
        try:
            search_url = f"https://www.indeed.com/jobs?q={quote_plus(keyword)}&l={quote_plus(location or '')}"
            
            # Indeed-specific cookies
            cookies = {'CTK': '1234567890abcdef'}  # Indeed cookie
            
            async with httpx.AsyncClient(timeout=15.0, headers=self.headers, cookies=cookies) as client:
                try:
                    response = await client.get(search_url, follow_redirects=True)
                    
                    if response.status_code == 403:
                        logger.warning("⚠️ Indeed blocking requests. Try ScraperAPI or official API.")
                        return []
                    
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        job_cards = soup.find_all('div', class_='job_seen_beacon', limit=max_results)
                        
                        for card in job_cards:
                            try:
                                title_elem = card.find('h2', class_='jobTitle')
                                company_elem = card.find('span', class_='companyName')
                                location_elem = card.find('div', class_='companyLocation')
                                
                                if title_elem and company_elem:
                                    # Extract job link
                                    link = title_elem.find('a')
                                    job_key = link.get('data-jk', '') if link else ''
                                    job_url = f"https://www.indeed.com/viewjob?jk={job_key}" if job_key else ""
                                    
                                    jobs.append({
                                        "platform": "indeed",
                                        "platform_name": "Indeed",
                                        "job_title": title_elem.get_text(strip=True),
                                        "company_name": company_elem.get_text(strip=True),
                                        "company_location": location_elem.get_text(strip=True) if location_elem else location or "Not specified",
                                        "job_url": job_url,
                                        "platform_job_url": job_url,
                                        "description": f"Position at {company_elem.get_text(strip=True)}",
                                        "requirements": [],
                                        "employment_type": "full-time",
                                        "experience_level": "mid",
                                        "remote_option": False,
                                        "posted_date": datetime.now().isoformat()
                                    })
                            except Exception as e:
                                logger.debug(f"Error parsing Indeed job card: {e}")
                                continue
                                
                except httpx.RequestError as e:
                    logger.error(f"❌ Indeed request failed: {e}")
                    
        except Exception as e:
            logger.error(f"❌ Indeed search failed: {e}")
        
        logger.info(f"✅ Indeed: {len(jobs)} jobs")
        return jobs
    
    async def _search_glassdoor(
        self,
        keyword: str,
        location: Optional[str],
        max_results: int
    ) -> List[Dict]:
        """Search Glassdoor (requires complex scraping)"""
        logger.info(f"🔍 Searching Glassdoor for: {keyword}")
        # Glassdoor requires more complex scraping due to anti-bot measures
        # For production, recommend using Glassdoor API if available
        logger.warning("⚠️ Glassdoor requires API access or advanced scraping")
        return []
    
    async def _search_academic_positions(
        self,
        keyword: str,
        location: Optional[str],
        max_results: int
    ) -> List[Dict]:
        """Search Academic Positions with improved headers"""
        logger.info(f"🔍 Searching Academic Positions for: {keyword}")
        
        jobs = []
        try:
            # Try search page first
            search_url = f"https://academicpositions.com/find-jobs/{quote_plus(keyword)}"
            
            async with httpx.AsyncClient(timeout=15.0, headers=self.headers) as client:
                try:
                    response = await client.get(search_url, follow_redirects=True)
                    
                    if response.status_code == 403:
                        # Try alternative API endpoint
                        logger.warning("⚠️ Academic Positions blocking. Trying API endpoint...")
                        search_url = f"https://academicpositions.com/api/positions/search?q={quote_plus(keyword)}"
                        response = await client.get(search_url, follow_redirects=True)
                    
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        job_listings = soup.find_all('div', class_='job-listing', limit=max_results)
                        
                        for listing in job_listings:
                            try:
                                title_elem = listing.find('h2') or listing.find('h3')
                                company_elem = listing.find('div', class_='employer')
                                link_elem = listing.find('a', href=True)
                                
                                if title_elem and link_elem:
                                    job_url = urljoin("https://academicpositions.com", link_elem['href'])
                                    
                                    jobs.append({
                                        "platform": "academic_positions",
                                        "platform_name": "Academic Positions",
                                        "job_title": title_elem.get_text(strip=True),
                                        "company_name": company_elem.get_text(strip=True) if company_elem else "Academic Institution",
                                        "company_location": location or "Europe",
                                        "job_url": job_url,
                                        "platform_job_url": job_url,
                                        "description": "Academic position",
                                        "requirements": ["PhD or equivalent", "Research experience"],
                                        "employment_type": "full-time",
                                        "experience_level": "postdoc",
                                        "remote_option": False,
                                        "posted_date": datetime.now().isoformat()
                                    })
                            except Exception as e:
                                logger.debug(f"Error parsing Academic Positions job: {e}")
                                continue
                                
                except httpx.RequestError as e:
                    logger.error(f"❌ Academic Positions request failed: {e}")
                    
        except Exception as e:
            logger.error(f"❌ Academic Positions search failed: {e}")
        
        logger.info(f"✅ Academic Positions: {len(jobs)} jobs")
        return jobs
    
    async def _search_euraxess(
        self,
        keyword: str,
        location: Optional[str],
        max_results: int
    ) -> List[Dict]:
        """Search EURAXESS"""
        logger.info(f"🔍 Searching EURAXESS for: {keyword}")
        
        jobs = []
        try:
            search_url = f"https://euraxess.ec.europa.eu/jobs/search?keywords={quote_plus(keyword)}"
            
            async with httpx.AsyncClient(timeout=15.0, headers=self.headers) as client:
                try:
                    response = await client.get(search_url, follow_redirects=True)
                    
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        job_listings = soup.find_all('div', class_='views-row', limit=max_results)
                        
                        for listing in job_listings:
                            try:
                                title_elem = listing.find('h3') or listing.find('h2')
                                link_elem = title_elem.find('a', href=True) if title_elem else None
                                
                                if title_elem and link_elem:
                                    job_url = urljoin("https://euraxess.ec.europa.eu", link_elem['href'])
                                    
                                    jobs.append({
                                        "platform": "euraxess",
                                        "platform_name": "EURAXESS",
                                        "job_title": title_elem.get_text(strip=True),
                                        "company_name": "European Research Institution",
                                        "company_location": location or "Europe",
                                        "job_url": job_url,
                                        "platform_job_url": job_url,
                                        "description": "Research position in Europe",
                                        "requirements": ["PhD", "Research experience"],
                                        "employment_type": "full-time",
                                        "experience_level": "postdoc",
                                        "remote_option": False,
                                        "posted_date": datetime.now().isoformat()
                                    })
                            except Exception as e:
                                logger.debug(f"Error parsing EURAXESS job: {e}")
                                continue
                                
                except httpx.RequestError as e:
                    logger.error(f"❌ EURAXESS request failed: {e}")
                    
        except Exception as e:
            logger.error(f"❌ EURAXESS search failed: {e}")
        
        logger.info(f"✅ EURAXESS: {len(jobs)} jobs")
        return jobs
    
    async def _search_academic_transfer(
        self,
        keyword: str,
        location: Optional[str],
        max_results: int
    ) -> List[Dict]:
        """Search Academic Transfer"""
        logger.info(f"🔍 Searching Academic Transfer for: {keyword}")
        logger.warning("⚠️ Academic Transfer requires complex scraping")
        return []
    
    def get_platform_info(self, platform_key: str) -> Optional[Dict]:
        """Get information about a specific platform"""
        return self.platforms.get(platform_key)
    
    def get_all_platforms_info(self) -> List[Dict]:
        """Get information about all available platforms"""
        return [
            {
                "key": key,
                "name": info["name"],
                "url": info["url"],
                "category": info.get("category", "General")
            }
            for key, info in self.platforms.items()
        ]