"""
Configuration settings
Environment variables and API keys
"""

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # API Keys - retrieved from environment variables
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    
    # Deepgram settings
    DEEPGRAM_MODEL: str = "nova-2"
    DEEPGRAM_LANGUAGE: str = "tr"  # Turkish
    
    # Gemini settings
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_TEMPERATURE: float = 0.7
    GEMINI_MAX_TOKENS: int = 1000
    
    # ElevenLabs settings
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
    ELEVENLABS_MODEL: str = "eleven_multilingual_v2"
    ELEVENLABS_STABILITY: float = 0.5
    ELEVENLABS_SIMILARITY_BOOST: float = 0.75
    
    # Audio settings
    SAMPLE_RATE: int = 16000
    AUDIO_FORMAT: str = "wav"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Check if all API keys are present
def validate_api_keys():
    """Validate the presence of required API keys"""
    missing_keys = []
    
    if not settings.DEEPGRAM_API_KEY:
        missing_keys.append("DEEPGRAM_API_KEY")
    if not settings.GEMINI_API_KEY:
        missing_keys.append("GEMINI_API_KEY")
    if not settings.ELEVENLABS_API_KEY:
        missing_keys.append("ELEVENLABS_API_KEY")
    
    if missing_keys:
        raise ValueError(f"Missing required API keys: {', '.join(missing_keys)}")
    
    return True
