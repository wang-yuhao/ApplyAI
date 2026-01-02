"""
NewAPI Provider - OpenAI-compatible AI models aggregation service
Supports multiple AI models through a unified OpenAI-compatible API
"""

import httpx
import logging
from typing import Optional, Dict, Any
from functools import wraps
import asyncio
import time

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple rate limiter for API calls"""
    
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


class NewAPIProvider:
    """
    NewAPI Provider - OpenAI-compatible interface to multiple AI models
    
    Supports:
    - OpenAI models (GPT-4, GPT-3.5, etc.)
    - Claude models (via OpenAI format)
    - Gemini models (via OpenAI format)
    - Other models through NewAPI aggregation
    
    Documentation: https://docs.newapi.pro
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.provider_name = "NewAPI"
        self.config = config
        self.api_key = config.get("api_key")
        self.base_url = config.get("base_url", "https://api.newapi.pro/v1")
        self.model = config.get("model", "gpt-4o")
        self.max_tokens = config.get("max_tokens", 4096)
        self.temperature = config.get("temperature", 0.7)
        self.timeout = config.get("timeout", 60)
        
        if not self.api_key:
            raise ValueError("NewAPI API key is required")
        
        logger.info(f"✓ NewAPI initialized with base_url: {self.base_url}")
        logger.info(f"  Default model: {self.model}")
    
    def log_request(self, prompt: str, model: str):
        logger.info(f"{self.provider_name} request | Model: {model} | Prompt: {len(prompt)} chars")
    
    def log_response(self, response: str, duration: float):
        logger.info(f"{self.provider_name} response | Length: {len(response)} chars | Duration: {duration:.2f}s")
    
    @RateLimiter(calls_per_minute=50)
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Generate completion using NewAPI
        
        Args:
            prompt: User prompt
            system_prompt: Optional system message
            model: Model to use (default: self.model)
            **kwargs: Additional parameters (temperature, max_tokens, etc.)
        
        Returns:
            Generated text completion
        """
        model_to_use = model or self.model
        self.log_request(prompt, model_to_use)
        start_time = time.time()
        
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": model_to_use,
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                "temperature": kwargs.get("temperature", self.temperature),
            }
            
            # Add optional parameters if provided
            if "top_p" in kwargs:
                payload["top_p"] = kwargs["top_p"]
            if "frequency_penalty" in kwargs:
                payload["frequency_penalty"] = kwargs["frequency_penalty"]
            if "presence_penalty" in kwargs:
                payload["presence_penalty"] = kwargs["presence_penalty"]
            if "stop" in kwargs:
                payload["stop"] = kwargs["stop"]
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
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
                
        except httpx.HTTPStatusError as e:
            logger.error(f"NewAPI HTTP error: {e.response.status_code} - {e.response.text}")
            raise Exception(f"NewAPI request failed: {e.response.status_code}")
        except Exception as e:
            logger.error(f"NewAPI error: {str(e)}")
            raise
    
    async def list_models(self) -> list:
        """
        List available models from NewAPI
        
        Returns:
            List of available model IDs
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                    },
                )
                
                response.raise_for_status()
                data = response.json()
                
                models = [model["id"] for model in data.get("data", [])]
                logger.info(f"NewAPI: Found {len(models)} available models")
                return models
                
        except Exception as e:
            logger.error(f"Failed to list NewAPI models: {str(e)}")
            return []
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass