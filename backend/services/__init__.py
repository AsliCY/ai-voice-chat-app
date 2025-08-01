"""
Services package
Imports all service classes in this folder
"""

from .deepgram_service import DeepgramService
from .gemini_service import GeminiService
from .elevenlabs_service import ElevenLabsService

__all__ = [
    'DeepgramService',
    'GeminiService', 
    'ElevenLabsService'
]

# Package information
__version__ = '1.0.0'
__author__ = 'Voice AI Agent Project'
__description__ = 'Package that manages AI services'