"""
Text to Speech service using ElevenLabs API
"""

import asyncio
import logging
from typing import Optional
import aiohttp
import json

from config import settings

logger = logging.getLogger(__name__)

class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.base_url = "https://api.elevenlabs.io/v1"
        self.voice_id = settings.ELEVENLABS_VOICE_ID
        self.headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
    
    async def text_to_speech(self, text: str) -> Optional[bytes]:
        """
        Converts text to speech using ElevenLabs API
        
        Args:
            text: Text to be converted to speech
            
        Returns:
            bytes: Audio data or None
        """
        try:
            # Construct the API URL
            url = f"{self.base_url}/text-to-speech/{self.voice_id}"
            
            # Prepare the request payload
            payload = {
                "text": text,
                "model_id": settings.ELEVENLABS_MODEL,
                "voice_settings": {
                    "stability": settings.ELEVENLABS_STABILITY,
                    "similarity_boost": settings.ELEVENLABS_SIMILARITY_BOOST,
                    "style": 0.0,
                    "use_speaker_boost": True
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=self.headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)  # TTS may take longer
                ) as response:
                    
                    if response.status == 200:
                        audio_data = await response.read()
                        logger.info(f"TTS successful, audio size: {len(audio_data)} bytes")
                        return audio_data
                    else:
                        error_text = await response.text()
                        logger.error(f"ElevenLabs API error {response.status}: {error_text}")
                        return None
                        
        except aiohttp.ClientTimeout:
            logger.error("ElevenLabs API timeout")
            return None
        except aiohttp.ClientError as e:
            logger.error(f"ElevenLabs API client error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"ElevenLabs TTS error: {str(e)}")
            return None
    
    async def get_available_voices(self) -> Optional[list]:
        """
        Lists available voices
        
        Returns:
            list: List of voices or None
        """
        try:
            url = f"{self.base_url}/voices"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    headers={"xi-api-key": self.api_key},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        voices = result.get("voices", [])
                        logger.info(f"Retrieved {len(voices)} voices")
                        return voices
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to get voices {response.status}: {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Get voices error: {str(e)}")
            return None
    
    async def health_check(self) -> bool:
        """
        Checks the health status of the ElevenLabs API
        
        Returns:
            bool: Whether the API is reachable
        """
        try:
            url = f"{self.base_url}/user"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    headers={"xi-api-key": self.api_key},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"ElevenLabs health check failed: {str(e)}")
            return False
    
    async def get_voice_info(self, voice_id: str) -> Optional[dict]:
        """
        Retrieves information about a specific voice
        
        Args:
            voice_id: ID of the voice
            
        Returns:
            dict: Voice information or None
        """
        try:
            url = f"{self.base_url}/voices/{voice_id}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    headers={"xi-api-key": self.api_key},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    
                    if response.status == 200:
                        voice_info = await response.json()
                        logger.info(f"Voice info retrieved for {voice_id}")
                        return voice_info
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to get voice info {response.status}: {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Get voice info error: {str(e)}")
            return None
