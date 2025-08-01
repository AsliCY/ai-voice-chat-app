"""
Real-Time Voice AI Agent - Backend Server
FastAPI + WebSocket + Deepgram + Gemini + ElevenLabs
"""

import asyncio
import base64
import json
import logging
from typing import Dict, Optional
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from services.deepgram_service import DeepgramService
from services.gemini_service import GeminiService
from services.elevenlabs_service import ElevenLabsService
from config import settings

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Voice AI Agent API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize service classes
deepgram_service = DeepgramService()
gemini_service = GeminiService()
elevenlabs_service = ElevenLabsService()

# Track active WebSocket connections
active_connections: Dict[str, WebSocket] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected")
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected")
    
    async def send_message(self, client_id: str, message: dict):
        websocket = self.active_connections.get(client_id)
        if websocket:
            await websocket.send_text(json.dumps(message))

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Voice AI Agent Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "services": "operational"}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # Receive data from mobile client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            await process_audio_message(client_id, message)
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}")
        await manager.send_message(client_id, {
            "type": "error",
            "message": f"Server error: {str(e)}"
        })
        manager.disconnect(client_id)

async def process_audio_message(client_id: str, message: dict):
    """Process incoming audio message and generate response"""
    try:
        message_type = message.get("type")
        
        if message_type == "audio_data":
            # Get base64 audio data
            audio_base64 = message.get("audio_data")
            if not audio_base64:
                await manager.send_message(client_id, {
                    "type": "error",
                    "message": "Audio data not found"
                })
                return
            
            # Notify client that processing has started
            await manager.send_message(client_id, {
                "type": "status",
                "message": "Processing audio..."
            })
            
            # 1. STT with Deepgram (Speech to Text)
            try:
                audio_bytes = base64.b64decode(audio_base64)
                transcription = await deepgram_service.transcribe_audio(audio_bytes)
                
                if not transcription:
                    await manager.send_message(client_id, {
                        "type": "error", 
                        "message": "Could not transcribe audio"
                    })
                    return
                
                logger.info(f"Transcription: {transcription}")
                
                # Send transcription to client
                await manager.send_message(client_id, {
                    "type": "transcription",
                    "text": transcription
                })
                
            except Exception as e:
                logger.error(f"Deepgram STT error: {str(e)}")
                await manager.send_message(client_id, {
                    "type": "error",
                    "message": "Error occurred while transcribing audio"
                })
                return
            
            # 2. Generate AI response with Gemini Pro
            try:
                await manager.send_message(client_id, {
                    "type": "status",
                    "message": "Generating AI response..."
                })
                
                ai_response = await gemini_service.generate_response(transcription)
                
                if not ai_response:
                    await manager.send_message(client_id, {
                        "type": "error",
                        "message": "Failed to generate AI response"
                    })
                    return
                
                logger.info(f"AI Response: {ai_response}")
                
                # Send AI response to client
                await manager.send_message(client_id, {
                    "type": "ai_response",
                    "text": ai_response
                })
                
            except Exception as e:
                logger.error(f"Gemini AI error: {str(e)}")
                await manager.send_message(client_id, {
                    "type": "error",
                    "message": "Error occurred while generating AI response"
                })
                return
            
            # 3. Convert to speech using ElevenLabs (TTS)
            try:
                await manager.send_message(client_id, {
                    "type": "status",
                    "message": "Generating speech..."
                })
                
                audio_response = await elevenlabs_service.text_to_speech(ai_response)
                
                if not audio_response:
                    await manager.send_message(client_id, {
                        "type": "error",
                        "message": "Failed to generate speech"
                    })
                    return
                
                # Encode audio response as base64
                audio_base64_response = base64.b64encode(audio_response).decode('utf-8')
                
                # Send audio response to client
                await manager.send_message(client_id, {
                    "type": "audio_response",
                    "audio_data": audio_base64_response,
                    "text": ai_response
                })
                
                logger.info("Audio response sent successfully")
                
            except Exception as e:
                logger.error(f"ElevenLabs TTS error: {str(e)}")
                await manager.send_message(client_id, {
                    "type": "error",
                    "message": "Error occurred while generating speech"
                })
                return
        
        elif message_type == "test_ai":
            # AI-only test — skip STT and go directly to Gemini
            text = message.get("text", "")
            if text:
                try:
                    await manager.send_message(client_id, {
                        "type": "status",
                        "message": "Generating AI response..."
                    })
                    
                    ai_response = await gemini_service.generate_response(text)
                    await manager.send_message(client_id, {
                        "type": "ai_response",
                        "text": ai_response
                    })
                    
                    # Convert AI response to speech
                    await manager.send_message(client_id, {
                        "type": "status",
                        "message": "Generating speech..."
                    })
                    
                    audio_response = await elevenlabs_service.text_to_speech(ai_response)
                    if audio_response:
                        audio_base64_response = base64.b64encode(audio_response).decode('utf-8')
                        await manager.send_message(client_id, {
                            "type": "audio_response",
                            "audio_data": audio_base64_response,
                            "text": ai_response
                        })
                    else:
                        await manager.send_message(client_id, {
                            "type": "error",
                            "message": "Failed to generate speech"
                        })
                        
                except Exception as e:
                    logger.error(f"AI test error: {str(e)}")
                    await manager.send_message(client_id, {
                        "type": "error",
                        "message": f"AI test error: {str(e)}"
                    })
            else:
                await manager.send_message(client_id, {
                    "type": "error",
                    "message": "Test text not found"
                })
        
        elif message_type == "ping":
            # Connection check
            await manager.send_message(client_id, {
                "type": "pong",
                "message": "Connection is active"
            })
    
    except Exception as e:
        logger.error(f"Process audio message error: {str(e)}")
        await manager.send_message(client_id, {
            "type": "error",
            "message": "Error occurred while processing the message"
        })

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="info",
        reload=True
    )
