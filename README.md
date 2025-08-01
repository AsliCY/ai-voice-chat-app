# 🎙️ Voice Chat AI

<div align="center">
  <img src="https://i.imgur.com/YOUR_GIF_ID.gif" alt="Voice Chat AI Demo" width="700"/>
  <p><em>🎤 Mikrofona konuş → 📝 Anlık transkripsiyon → 🤖 AI yanıtı → 🔊 Sesli geri dönüş</em></p>
</div>

A modern **real-time voice AI agent** that enables users to interact with AI through speech and receive voice responses. Built with React frontend, FastAPI backend, and powered by Gemini 1.5 Flash for intelligent conversations.

![Voice Chat AI Demo](https://img.shields.io/badge/Status-Working-brightgreen)
![React](https://img.shields.io/badge/React-18.x-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![Python](https://img.shields.io/badge/Python-3.9+-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## ✨ Features

- 🎤 **Real-time Voice Recording** - High-quality audio capture with WebRTC
- 🗣️ **Speech-to-Text** - Powered by Deepgram Nova-2 with Turkish language support
- 🤖 **AI Responses** - Intelligent conversations using Google Gemini 1.5 Flash
- 🔊 **Text-to-Speech** - Natural voice synthesis with ElevenLabs
- 🌐 **WebSocket Communication** - Real-time bidirectional messaging
- 📱 **Responsive UI** - Modern Material-UI React interface
- 🔄 **Auto Format Conversion** - Supports WebM, MP4, WAV, OGG audio formats
- 🌍 **Turkish Language Support** - Full Turkish speech recognition and responses
- ⚡ **Asynchronous Architecture** - High-performance backend with FastAPI
- 🔒 **Secure API Management** - Environment variables for API key management
- 📊 **Comprehensive Logging** - Detailed error handling and monitoring

## 🏗️ System Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   React App     │◄───────────────►│   FastAPI       │
│   (Frontend)    │                 │   (Backend)     │
└─────────────────┘                 └─────────────────┘
                                            │
                            ┌───────────────┼───────────────┐
                            │               │               │
                    ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼─────┐
                    │   Deepgram   │ │Gemini 1.5   │ │ ElevenLabs │
                    │   Nova-2     │ │   Flash     │ │    TTS     │
                    └──────────────┘ └─────────────┘ └───────────┘
```

### Processing Flow
1. **Audio Recording**: User records voice input via React interface
2. **Format Conversion**: WebM/MP4 audio converted to WAV automatically
3. **STT**: Deepgram Nova-2 API converts speech to text
4. **AI Processing**: Gemini 1.5 Flash generates intelligent responses
5. **TTS**: ElevenLabs converts text back to natural speech
6. **Response**: Audio response streamed back via WebSocket

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- npm or yarn
- API Keys:
  - [Deepgram](https://console.deepgram.com/) - Turkish Speech to Text
  - [Google AI Studio](https://makersuite.google.com/app/apikey) - Gemini 1.5 Flash
  - [ElevenLabs](https://elevenlabs.io/) - Text to Speech

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd voice-chat-app
   ```

2. **Setup Python environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   # Required API Keys
   DEEPGRAM_API_KEY=your_deepgram_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   
   # Server Settings
   HOST=0.0.0.0
   PORT=8000
   
   # Deepgram Settings
   DEEPGRAM_MODEL=nova-2
   DEEPGRAM_LANGUAGE=tr
   
   # Gemini Settings
   GEMINI_MODEL=gemini-1.5-flash
   GEMINI_TEMPERATURE=0.7
   GEMINI_MAX_TOKENS=1000
   
   # ElevenLabs Settings
   ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
   ELEVENLABS_MODEL=eleven_multilingual_v2
   ELEVENLABS_STABILITY=0.5
   ELEVENLABS_SIMILARITY_BOOST=0.75
   
   # Audio Settings
   SAMPLE_RATE=16000
   AUDIO_FORMAT=wav
   ```

5. **Start backend server**
   ```bash
   python main.py
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd ../  # Go back to root
   npm install
   ```

2. **Start development server**
   ```bash
   npm start
   ```

3. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### API Keys Setup

#### Deepgram (Speech-to-Text)
1. Sign up at [Deepgram](https://deepgram.com/)
2. Get your API key from dashboard
3. Add to `.env` file

#### Google Gemini 1.5 Flash (AI)
1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Create API key
3. Add to `.env` file

#### ElevenLabs (Text-to-Speech)
1. Register at [ElevenLabs](https://elevenlabs.io/)
2. Get API key from profile
3. Add to `.env` file

## 📁 Project Structure

```
voice-chat-app/
├── backend/                 # FastAPI backend
│   ├── services/           # Core services
│   │   ├── deepgram_service.py    # Speech-to-Text service
│   │   ├── gemini_service.py      # AI response service
│   │   └── elevenlabs_service.py  # Text-to-Speech service
│   ├── config.py           # Configuration settings
│   ├── main.py             # FastAPI app entry point
│   ├── requirements.txt    # Python dependencies
│   └── .env.example       # Environment variables template
├── src/                    # React frontend
│   ├── services/          # Frontend services
│   │   ├── WebSocketService.ts    # WebSocket communication
│   │   └── AudioService.ts        # Audio recording/playback
│   ├── App.tsx            # Main React component
│   └── index.tsx          # Entry point
├── public/                # Static files
└── package.json           # Node.js dependencies
```

## 🎯 Usage

### Basic Voice Chat
1. Click the microphone button in React interface
2. Speak clearly (minimum 2 seconds)
3. Click again to stop recording
4. Wait for AI response with visual feedback
5. Listen to the synthesized reply

### Text Testing
Use the "AI Test" section to test without voice:
1. Type your message in the input field
2. Click "Send" button
3. Get AI response with audio playback

### Supported Commands
- **General Chat**: "Merhaba nasılsın?"
- **Creative**: "Kısa bir hikaye yaz"
- **Educational**: "Python nedir açıkla"
- **Help**: "Zaman yönetimi ipuçları ver"
- **Questions**: "Yapay zeka nedir?"

## 🔧 API Services

### Deepgram (Speech-to-Text)
- **Model**: Nova-2
- **Language**: Turkish (tr)
- **Format**: 16kHz, Mono, WAV
- **Features**: Smart formatting, punctuation, confidence scores

### Gemini 1.5 Flash (AI Responses)
- **Model**: gemini-1.5-flash
- **Language**: Turkish
- **Features**: Context awareness, conversation history, safety filters
- **Response Format**: Concise, conversational Turkish responses

### ElevenLabs (Text-to-Speech)
- **Model**: eleven_multilingual_v2
- **Language**: Turkish voice synthesis
- **Voice**: Customizable voice selection
- **Quality**: High-quality Turkish speech synthesis
- **Format**: MP3 output

## 🌐 WebSocket API

### Endpoints

#### HTTP Endpoints
- `GET /` - API information
- `GET /health` - System health check
- `GET /test/health` - All services health check

#### WebSocket Endpoint
- `WebSocket /ws/{client_id}` - Real-time audio communication

### WebSocket Message Formats

#### Client → Server Messages
```json
{
  "type": "audio_data",
  "audio_data": "base64_encoded_audio",
  "timestamp": "2024-01-01T00:00:00"
}
```

```json
{
  "type": "test_ai",
  "text": "Test message for AI",
  "timestamp": "2024-01-01T00:00:00"
}
```

#### Server → Client Messages
```json
{
  "type": "transcription",
  "text": "User's spoken text",
  "confidence": 0.95
}
```

```json
{
  "type": "ai_response", 
  "text": "AI's intelligent response"
}
```

```json
{
  "type": "audio_response",
  "audio_data": "base64_encoded_audio",
  "text": "AI's response text"
}
```

```json
{
  "type": "status",
  "message": "Processing audio...",
  "progress": 0.5
}
```

## 🔧 Development

### Backend Development

```bash
# Run with auto-reload
cd backend
python main.py

# Run tests
pytest

# Check logs with detailed output
python main.py --log-level debug
```

### Frontend Development

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Audio Format Support

The system automatically handles format conversion:
- **Browser Input**: WebM (Chrome/Firefox), MP4 (Safari), WAV
- **Backend Processing**: Automatic format detection and conversion
- **Deepgram Input**: 16kHz mono WAV (optimized)
- **ElevenLabs Output**: High-quality MP3

## 🐛 Troubleshooting

### Common Issues

#### "WebSocket connection failed"
- Check if backend server is running on port 8000
- Verify firewall settings allow port 8000
- Ensure CORS is properly configured
- Try different server URL (localhost vs 127.0.0.1)

#### "Microphone permission denied"
- Allow microphone access in browser settings
- Check system microphone permissions
- Try HTTPS (required for microphone access)
- Refresh page after granting permissions
- **Note**: Desktop browsers recommended for optimal performance

#### "Empty transcript received" / "Audio too short"
- Speak louder and clearer
- Ensure minimum 2-second recording
- Check microphone functionality
- Verify Deepgram API limits not exceeded

#### API Key Errors
```
ERROR: Deepgram API error 401: Unauthorized
```
**Solution**: Verify API keys in `.env` file are correct and active.

### Debug Mode

Enable debug logging by:
1. Click the "🐛" icon in React interface
2. Monitor WebSocket connection status
3. View audio processing details
4. Check API response times and errors

### Performance Monitoring

```bash
# Backend health check
curl http://localhost:8000/health

# All services health check
curl http://localhost:8000/test/health

# WebSocket test (Browser Console)
const ws = new WebSocket('ws://localhost:8000/ws/test123');
ws.onopen = () => console.log('Connected!');
ws.send(JSON.stringify({type: 'ping'}));
```

## 📊 Performance

### Real-world Metrics
- **WebSocket Latency**: < 100ms
- **Speech Recognition**: ~500ms (Deepgram Nova-2)
- **AI Response**: ~1-2s (Gemini 1.5 Flash)
- **Voice Synthesis**: ~800ms (ElevenLabs)
- **Total Round Trip**: 3-4 seconds

### Optimizations
- Audio compression for faster upload
- Chunked audio processing (250ms chunks)
- WebSocket connection pooling
- Automatic reconnection handling
- Format conversion optimization

## 🌟 Features in Detail

### Audio Processing
- **Format Detection**: Automatic WebM/MP4/WAV recognition
- **Quality Enhancement**: Noise reduction and normalization
- **Compression**: Efficient bandwidth usage
- **Error Recovery**: Robust error handling and fallbacks

### AI Integration
- **Context Awareness**: Maintains conversation flow
- **Turkish Language**: Native Turkish conversation support
- **Diverse Responses**: Educational, creative, and helpful content
- **Safety Filtering**: Content moderation and appropriate responses

### Real-time Communication
- **WebSocket Protocol**: Low-latency bidirectional communication
- **Automatic Reconnection**: Handles network interruptions gracefully
- **Heartbeat Monitoring**: Connection health checks every 30s
- **Error Recovery**: Graceful degradation and status updates

## 🔐 Security

- API keys stored securely in environment variables
- CORS protection enabled for cross-origin requests
- Input validation on all endpoints
- Rate limiting recommended for production
- No persistent audio data storage on server
- WebSocket connections tracked by unique client IDs

## 📈 Production Deployment

### Scaling Considerations
- **Horizontal Scaling**: Stateless backend design supports multiple instances
- **Load Balancing**: WebSocket-compatible load balancer required
- **Database**: Consider adding Redis for session management
- **CDN**: Serve static React assets via CDN

### Deployment Checklist
- **Docker**: Containerization support can be added
- **Nginx**: Reverse proxy with SSL termination
- **HTTPS**: SSL certificate required for microphone access
- **Environment**: Separate .env files for staging/production
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **Logging**: Centralized logging with ELK Stack

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow TypeScript/Python best practices
- Add tests for new features
- Update documentation for API changes
- Test WebSocket connections thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Deepgram](https://deepgram.com/) for high-quality speech recognition
- [Google Gemini](https://deepmind.google/technologies/gemini/) for intelligent AI responses
- [ElevenLabs](https://elevenlabs.io/) for realistic voice synthesis
- [FastAPI](https://fastapi.tiangolo.com/) for modern Python web framework
- [React](https://reactjs.org/) for powerful frontend framework
- [Material-UI](https://mui.com/) for beautiful UI components

## 📞 Support

For support and questions:
1. Check the troubleshooting section above
2. Review debug logs and error messages
3. Search existing GitHub issues
4. Create new issue with detailed description and logs

---

**Developer**: Aslı Candan Yıldırım 
**Version**: 1.0.0  
**Last Updated**: 2025

> "Bringing human-AI conversation to the next level with voice technology"