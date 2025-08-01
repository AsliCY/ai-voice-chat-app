// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Fab,
  Collapse
} from '@mui/material';
import {
  Mic,
  MicOff,
  Send,
  VolumeUp,
  Settings,
  Refresh,
  BugReport,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import WebSocketService from './services/WebSocketService';
import AudioService from './services/AudioService';
import './App.css';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: Date;
  audioData?: Uint8Array;
}

function App() {
  // Services
  const wsService = useRef(new WebSocketService());
  const audioService = useRef(new AudioService());

  // States
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('Bağlantı yok');
  const [messages, setMessages] = useState<Message[]>([]);
  const [testText, setTestText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Recording timer states
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize services
  useEffect(() => {
    initializeServices();
    return () => {
      cleanup();
    };
  }, []);

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 49)]);
    console.log(message);
  };

  const initializeServices = async () => {
    try {
      addLog('🚀 Servisler başlatılıyor...');

      // Audio service callbacks
      audioService.current.setCallbacks({
        onRecordingStart: () => {
          setIsRecording(true);
          addLog('🎙️ Kayıt başladı');
        },
        onRecordingStop: (audioData) => {
          setIsRecording(false);
          addLog(`📁 Kayıt tamamlandı: ${audioData.length} bytes`);
          
          // Minimum boyut kontrolü
          if (audioData.length < 5000) {
            addLog(`⚠️ Uyarı: Ses verisi çok küçük (${audioData.length} bytes)`);
            setError('Ses kaydı çok kısa. Lütfen daha uzun konuşun.');
            return;
          }
          
          handleAudioRecorded(audioData);
        },
        onRecordingError: (error) => {
          setIsRecording(false);
          addLog(`❌ Kayıt hatası: ${error}`);
          setError(error);
        }
      });

      // WebSocket service callbacks
      wsService.current.setCallbacks({
        onConnectionChange: (connected) => {
          setIsConnected(connected);
          setCurrentStatus(connected ? 'Bağlandı' : 'Bağlantı kesildi');
          addLog(`🔌 Bağlantı durumu: ${connected ? 'Bağlandı' : 'Kesildi'}`);
        },
        onTranscription: (text) => {
          addLog(`📝 Transkript: ${text}`);
          addMessage('user', text);
        },
        onAIResponse: (text) => {
          addLog(`🤖 AI Yanıtı: ${text}`);
          addMessage('ai', text);
          setIsLoading(false);
        },
        onAudioResponse: (audioData) => {
          addLog(`🔊 Ses yanıtı alındı: ${audioData.length} bytes`);
          playAudioResponse(audioData);
        },
        onStatus: (status) => {
          setCurrentStatus(status);
          addLog(`📊 Durum: ${status}`);
        },
        onError: (error) => {
          addLog(`❌ Hata: ${error}`);
          setError(error);
          setIsLoading(false);
        }
      });

      // Initialize audio
      const audioInitialized = await audioService.current.initialize();
      if (!audioInitialized) {
        throw new Error('Mikrofon başlatılamadı');
      }

      setIsInitialized(true);
      addLog('✅ Servisler başlatıldı');
    } catch (error) {
      addLog(`❌ Servis başlatma hatası: ${error}`);
      setError(`Servis başlatma hatası: ${error}`);
    }
  };

  const connectWebSocket = async () => {
    try {
      setError(null);
      setCurrentStatus('Bağlanıyor...');
      addLog('🔌 WebSocket bağlantısı kuruluyor...');
      
      const connected = await wsService.current.connect();
      if (!connected) {
        throw new Error('WebSocket bağlantısı kurulamadı');
      }
    } catch (error) {
      addLog(`❌ WebSocket bağlantı hatası: ${error}`);
      setError(`Bağlantı hatası: ${error}`);
    }
  };

  const handleStartRecording = async () => {
    try {
      if (!isConnected) {
        await connectWebSocket();
      }
      
      setError(null);
      addLog('🎤 Kayıt başlatılıyor...');
      await audioService.current.startRecording();
    } catch (error) {
      addLog(`❌ Kayıt başlatma hatası: ${error}`);
      setError(`Kayıt başlatma hatası: ${error}`);
    }
  };

  const handleStopRecording = () => {
    try {
      // Minimum süre kontrolü
      if (recordingDuration < 2) {
        setError('En az 2 saniye konuşun');
        addLog(`⚠️ Kayıt çok kısa: ${recordingDuration} saniye`);
        return;
      }

      addLog(`⏹️ Kayıt durduruluyor (${recordingDuration} saniye)...`);
      audioService.current.stopRecording();
    } catch (error) {
      addLog(`❌ Kayıt durdurma hatası: ${error}`);
      setError(`Kayıt durdurma hatası: ${error}`);
    }
  };

  const handleRecordingToggle = async () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      await handleStartRecording();
    }
  };

  const handleAudioRecorded = async (audioData: Uint8Array) => {
    try {
      setIsLoading(true);
      addLog('📤 Ses verisi sunucuya gönderiliyor...');
      wsService.current.sendAudioData(audioData);
    } catch (error) {
      addLog(`❌ Ses gönderme hatası: ${error}`);
      setError(`Ses gönderme hatası: ${error}`);
      setIsLoading(false);
    }
  };

  const handleTestAI = async () => {
    if (!testText.trim()) return;

    try {
      if (!isConnected) {
        await connectWebSocket();
      }

      setError(null);
      setIsLoading(true);
      addLog(`🧪 AI testi: ${testText}`);
      wsService.current.testAI(testText);
      setTestText('');
    } catch (error) {
      addLog(`❌ AI test hatası: ${error}`);
      setError(`AI test hatası: ${error}`);
      setIsLoading(false);
    }
  };

  const playAudioResponse = async (audioData: Uint8Array) => {
    try {
      await audioService.current.playAudio(audioData);
      addLog('✅ Ses çalma tamamlandı');
    } catch (error) {
      addLog(`❌ Ses çalma hatası: ${error}`);
      setError(`Ses çalma hatası: ${error}`);
    }
  };

  const addMessage = (type: 'user' | 'ai', text: string, audioData?: Uint8Array) => {
    const message: Message = {
      id: Date.now().toString(),
      type,
      text,
      timestamp: new Date(),
      audioData
    };
    setMessages(prev => [message, ...prev]);
  };

  const cleanup = () => {
    addLog('🧹 Temizlik yapılıyor...');
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    audioService.current.dispose();
    wsService.current.disconnect();
  };

  const getConnectionColor = (): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    if (isConnected) return 'success';
    if (currentStatus.includes('Bağlanıyor')) return 'warning';
    return 'error';
  };

  if (!isInitialized) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Uygulama başlatılıyor...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className="app-container">
      <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1">
            🎙️ Sesli Chat AI
          </Typography>
          <Box>
            <IconButton onClick={() => setShowDebug(!showDebug)} color="primary">
              <BugReport />
            </IconButton>
            <IconButton onClick={() => window.location.reload()} color="primary">
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {/* Connection Status */}
        <Box mb={2}>
          <Chip
            label={currentStatus}
            color={getConnectionColor()}
            icon={isConnected ? <VolumeUp /> : <Settings />}
            sx={{ mr: 1 }}
          />
          {!isConnected && (
            <Button variant="outlined" size="small" onClick={connectWebSocket}>
              Bağlan
            </Button>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Recording Button */}
        <Box display="flex" justifyContent="center" mb={3}>
          <Box textAlign="center">
            <Fab
              color={isRecording ? "secondary" : "primary"}
              size="large"
              onClick={handleRecordingToggle}
              disabled={isLoading}
              sx={{ 
                mb: 1,
                ...(isRecording && {
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)', opacity: 1 },
                    '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                    '100%': { transform: 'scale(1)', opacity: 1 }
                  }
                })
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : isRecording ? (
                <MicOff />
              ) : (
                <Mic />
              )}
            </Fab>
            
            {isRecording && (
              <Box>
                <Typography variant="h6" color="secondary" sx={{ fontWeight: 'bold' }}>
                  {recordingDuration}s
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Kayıt ediliyor...
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Typography variant="body2" align="center" color="textSecondary" mb={2}>
          {isRecording 
            ? `Konuşmayı bitirmek için tekrar tıklayın (${recordingDuration}s)` 
            : 'Konuşmaya başlamak için tıklayın (en az 2 saniye)'
          }
        </Typography>

        {/* Test AI Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🧪 AI Test
            </Typography>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="AI'yi test etmek için bir mesaj yazın..."
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTestAI()}
              />
              <Button
                variant="contained"
                onClick={handleTestAI}
                disabled={!testText.trim() || isLoading}
                startIcon={<Send />}
              >
                Gönder
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              💬 Konuşma Geçmişi
            </Typography>
            {messages.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ py: 2 }}>
                Henüz mesaj yok. Konuşmaya başlayın!
              </Typography>
            ) : (
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {messages.map((message, index) => (
                  <React.Fragment key={message.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography
                              component="span"
                              variant="body2"
                              color={message.type === 'user' ? 'primary' : 'secondary'}
                              fontWeight="bold"
                            >
                              {message.type === 'user' ? '👤 Sen' : '🤖 AI'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {message.timestamp.toLocaleTimeString()}
                            </Typography>
                          </Box>
                        }
                        secondary={message.text}
                      />
                    </ListItem>
                    {index < messages.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Debug Panel */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">
                🐛 Debug Logları
              </Typography>
              <IconButton onClick={() => setShowDebug(!showDebug)}>
                {showDebug ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            <Collapse in={showDebug}>
              <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                {debugLogs.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Henüz log yok...
                  </Typography>
                ) : (
                  debugLogs.map((log, index) => (
                    <Typography
                      key={index}
                      variant="body2"
                      component="div"
                      sx={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.75rem', 
                        mb: 0.5,
                        color: log.includes('❌') ? 'error.main' : 
                               log.includes('✅') ? 'success.main' :
                               log.includes('⚠️') ? 'warning.main' : 'text.primary'
                      }}
                    >
                      {log}
                    </Typography>
                  ))
                )}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
}

export default App;