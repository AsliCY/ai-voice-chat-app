"""
AI response generation service using Google Gemini Pro API
"""

import asyncio
import logging
from typing import Optional
import aiohttp
import json

from config import settings

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        self.conversation_history = []
    
    async def generate_response(self, user_input: str) -> Optional[str]:
        """
        Generates a response to user input using Gemini Pro
        
        Args:
            user_input: Text spoken by the user
            
        Returns:
            str: AI response or None
        """
        try:
            # System prompt - defines the AI agent's persona
            system_prompt = """You are a helpful, friendly, and intelligent Turkish-speaking AI assistant.
            Talk to users naturally, answer their questions, and assist them.
            Keep your responses short and concise (maximum 2-3 sentences), as this is a voice conversation.
            Use a warm and friendly tone."""
            
            # Update conversation history
            self.conversation_history.append({
                "role": "user",
                "parts": [{"text": user_input}]
            })
            
            # Prepare payload for the API request
            payload = {
                "contents": [
                    {
                        "role": "user", 
                        "parts": [{"text": f"{system_prompt}\n\nUser: {user_input}"}]
                    }
                ],
                "generationConfig": {
                    "temperature": settings.GEMINI_TEMPERATURE,
                    "maxOutputTokens": settings.GEMINI_MAX_TOKENS,
                    "topP": 0.8,
                    "topK": 40
                },
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH", 
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            params = {
                "key": self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    headers=headers,
                    params=params,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        
                        # Extract text from Gemini response
                        candidates = result.get("candidates", [])
                        
                        if candidates:
                            content = candidates[0].get("content", {})
                            parts = content.get("parts", [])
                            
                            if parts:
                                ai_response = parts[0].get("text", "").strip()
                                
                                if ai_response:
                                    # Add AI response to conversation history
                                    self.conversation_history.append({
                                        "role": "model",
                                        "parts": [{"text": ai_response}]
                                    })
                                    
                                    # Limit history to last 10 messages
                                    if len(self.conversation_history) > 10:
                                        self.conversation_history = self.conversation_history[-10:]
                                    
                                    logger.info(f"Gemini response generated: {ai_response}")
                                    return ai_response
                                else:
                                    logger.warning("Empty response from Gemini")
                                    return "Sorry, I can't respond right now."
                            else:
                                logger.warning("No parts found in Gemini response")
                                return "I'm experiencing a technical issue, please try again."
                        else:
                            logger.warning("No candidates found in Gemini response")
                            return "I couldn't generate a response, please try again."
                    else:
                        error_text = await response.text()
                        logger.error(f"Gemini API error {response.status}: {error_text}")
                        return "The service is currently unavailable, please try again later."
                        
        except aiohttp.ClientTimeout:
            logger.error("Gemini API timeout")
            return "The request timed out, please try again."
        except aiohttp.ClientError as e:
            logger.error(f"Gemini API client error: {str(e)}")
            return "I'm having trouble connecting, please try again."
        except Exception as e:
            logger.error(f"Gemini generation error: {str(e)}")
            return "An unexpected error occurred, please try again."
    
    async def health_check(self) -> bool:
        """
        Checks the health status of the Gemini API
        
        Returns:
            bool: Whether the API is reachable
        """
        try:
            test_payload = {
                "contents": [
                    {
                        "role": "user", 
                        "parts": [{"text": "Test"}]
                    }
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    params={"key": self.api_key},
                    json=test_payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Gemini health check failed: {str(e)}")
            return False
    
    def clear_conversation_history(self):
        """Clears the conversation history"""
        self.conversation_history = []
        logger.info("Conversation history cleared")
