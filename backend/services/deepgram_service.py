"""
Speech to Text service with Deepgram API - Audio Format Fix
"""

import asyncio
import logging
from typing import Optional
import aiohttp
import json
import io

from config import settings

# Required for audio processing
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    logging.warning("pydub not found - audio format conversion will be limited")

logger = logging.getLogger(__name__)

class DeepgramService:
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.base_url = "https://api.deepgram.com/v1/listen"
        self.headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "audio/wav"
        }
    
    async def transcribe_audio(self, audio_bytes: bytes) -> Optional[str]:
        """
        Transcribes audio to text using Deepgram API
        
        Args:
            audio_bytes: Audio data in bytes
            
        Returns:
            str: Transcript text or None
        """
        try:
            logger.info(f"Transcribing audio: {len(audio_bytes)} bytes")
            
            # Check and fix audio format
            processed_audio = await self._process_audio_format(audio_bytes)
            
            if not processed_audio:
                logger.error("Audio processing failed")
                return "Unsupported audio format"
            
            # Deepgram API parameters
            params = {
                "model": settings.DEEPGRAM_MODEL,
                "language": settings.DEEPGRAM_LANGUAGE,
                "smart_format": "true",
                "punctuate": "true",
                "encoding": "linear16",
                "sample_rate": settings.SAMPLE_RATE,
                "channels": 1
            }
            
            # Headers - specify content type as WAV
            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": "audio/wav"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    headers=headers,
                    params=params,
                    data=processed_audio,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    logger.info(f"Deepgram API response status: {response.status}")
                    
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"Deepgram response: {result}")
                        
                        # Get transcript from Deepgram response
                        alternatives = result.get("results", {}).get("channels", [{}])[0].get("alternatives", [])
                        
                        if alternatives:
                            transcript = alternatives[0].get("transcript", "").strip()
                            confidence = alternatives[0].get("confidence", 0)
                            
                            logger.info(f"Transcript: '{transcript}', Confidence: {confidence}")
                            
                            # Check confidence level
                            if confidence < 0.1:
                                logger.warning(f"Low confidence: {confidence}")
                                return "Poor audio quality, please try again"
                            
                            if transcript and len(transcript) > 0:
                                return transcript
                            else:
                                logger.warning("Empty transcript received - audio might be too short or silent")
                                return "Audio too short or silent"
                        else:
                            logger.warning("No alternatives found in Deepgram response")
                            return "No speech detected"
                    else:
                        error_text = await response.text()
                        logger.error(f"Deepgram API error {response.status}: {error_text}")
                        return "API error occurred"
                        
        except aiohttp.ClientTimeout:
            logger.error("Deepgram API timeout")
            return "API timeout"
        except aiohttp.ClientError as e:
            logger.error(f"Deepgram API client error: {str(e)}")
            return "API connection error"
        except Exception as e:
            logger.error(f"Deepgram transcription error: {str(e)}")
            return "Audio processing error"
    
    async def _process_audio_format(self, audio_bytes: bytes) -> Optional[bytes]:
        """
        Converts audio format to one compatible with Deepgram
        
        Args:
            audio_bytes: Raw audio data
            
        Returns:
            bytes: Processed audio in WAV format or None
        """
        try:
            # Minimum size check
            if len(audio_bytes) < 1000:  # Less than 1KB
                logger.warning(f"Audio data too small: {len(audio_bytes)} bytes")
                return None
            
            # Detect audio format
            audio_format = self._detect_audio_format(audio_bytes)
            logger.info(f"Detected audio format: {audio_format}")
            
            # If pydub not available and not WAV
            if not PYDUB_AVAILABLE:
                if audio_format == "wav":
                    return audio_bytes  # Use as is if WAV
                else:
                    logger.warning("pydub not available, only WAV supported")
                    return None
            
            # Convert using pydub
            try:
                # Create AudioSegment based on format
                if audio_format == "webm":
                    audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes), format="webm")
                elif audio_format == "mp4":
                    audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes), format="mp4")
                elif audio_format == "wav":
                    audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes), format="wav")
                elif audio_format == "ogg":
                    audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes), format="ogg")
                else:
                    # Try automatic detection
                    audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
                
                # Check audio properties
                duration_ms = len(audio_segment)
                logger.info(f"Audio duration: {duration_ms}ms, channels: {audio_segment.channels}, frame_rate: {audio_segment.frame_rate}Hz")
                
                # Too short audio check (minimum 500ms)
                if duration_ms < 500:
                    logger.warning(f"Audio too short: {duration_ms}ms")
                    return None
                
                # Optimize for Deepgram: 16kHz, mono, WAV
                optimized_audio = audio_segment.set_frame_rate(16000).set_channels(1)
                
                # Check and increase audio volume if needed
                if optimized_audio.max_possible_amplitude > 0:
                    rms = optimized_audio.rms
                    logger.info(f"Audio RMS level: {rms}")
                    
                    if rms < 500:  # Too quiet
                        normalized_audio = optimized_audio.normalize()
                        if normalized_audio.rms < 1000:
                            normalized_audio = normalized_audio + 6  # Apply 6dB gain
                            logger.info("Audio gain applied (volume was low)")
                        optimized_audio = normalized_audio
                
                # Export to WAV format
                output_buffer = io.BytesIO()
                optimized_audio.export(
                    output_buffer, 
                    format="wav",
                    parameters=[
                        "-ac", "1",       # mono
                        "-ar", "16000",   # 16kHz sample rate
                        "-sample_fmt", "s16"  # 16-bit
                    ]
                )
                
                wav_data = output_buffer.getvalue()
                logger.info(f"Processed audio: {len(wav_data)} bytes WAV")
                
                return wav_data
                
            except Exception as e:
                logger.error(f"Audio conversion error: {str(e)}")
                # Fallback: if conversion fails and format is WAV, use original
                if audio_format == "wav":
                    logger.info("Conversion failed, using original WAV")
                    return audio_bytes
                return None
                
        except Exception as e:
            logger.error(f"Audio format processing error: {str(e)}")
            return None
    
    def _detect_audio_format(self, audio_bytes: bytes) -> str:
        """
        Detects the audio format by inspecting header bytes
        
        Args:
            audio_bytes: Raw audio data
            
        Returns:
            str: Detected format (webm, mp4, wav, ogg, unknown)
        """
        if len(audio_bytes) < 12:
            return "unknown"
        
        # WebM/Matroska format
        if audio_bytes[:4] == b'\x1a\x45\xdf\xa3':
            return "webm"
        
        # MP4 format
        if len(audio_bytes) >= 8 and audio_bytes[4:8] == b'ftyp':
            return "mp4"
        
        # WAV format
        if audio_bytes[:4] == b'RIFF' and audio_bytes[8:12] == b'WAVE':
            return "wav"
        
        # OGG format
        if audio_bytes[:4] == b'OggS':
            return "ogg"
        
        # ID3 tag (MP3)
        if audio_bytes[:3] == b'ID3':
            return "mp3"
        
        # MP3 sync frame
        if len(audio_bytes) >= 2 and (audio_bytes[:2] == b'\xff\xfb' or audio_bytes[:2] == b'\xff\xfa'):
            return "mp3"
        
        return "unknown"
    
    async def health_check(self) -> bool:
        """
        Checks the health status of the Deepgram API
        
        Returns:
            bool: Whether the API is reachable
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.deepgram.com/v1/projects",
                    headers={"Authorization": f"Token {self.api_key}"},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Deepgram health check failed: {str(e)}")
            return False
