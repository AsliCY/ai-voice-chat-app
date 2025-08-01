// src/services/WebSocketService.ts
export interface WebSocketMessage {
  type: 'transcription' | 'ai_response' | 'audio_response' | 'status' | 'error' | 'pong';
  text?: string;
  audio_data?: string;
  message?: string;
  timestamp?: string;
}

export interface WebSocketCallbacks {
  onTranscription?: (text: string) => void;
  onAIResponse?: (text: string) => void;
  onAudioResponse?: (audioData: Uint8Array) => void;
  onStatus?: (status: string) => void;
  onError?: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private clientId: string;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(private serverUrl: string = 'ws://192.168.43.114:8000') {
    this.clientId = `web_${Date.now()}`;
  }

  public setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks;
  }

  public async connect(): Promise<boolean> {
    try {
      console.log('🔌 Establishing WebSocket connection...', `${this.serverUrl}/ws/${this.clientId}`);
      
      this.ws = new WebSocket(`${this.serverUrl}/ws/${this.clientId}`);

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket could not be created'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timed out'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.callbacks.onConnectionChange?.(true);
          this.startHeartbeat();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          console.log('🔌 WebSocket connection closed:', event.code, event.reason);
          this.isConnected = false;
          this.callbacks.onConnectionChange?.(false);
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
          
          if (event.code !== 1000) {
            reject(new Error(`Connection error: ${event.code} ${event.reason}`));
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket error:', error);
          this.callbacks.onError?.('WebSocket connection error');
          reject(error);
        };
      });

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.callbacks.onError?.(`Connection error: ${error}`);
      return false;
    }
  }

  private handleMessage(data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      console.log('📨 Message received:', message.type, message);

      switch (message.type) {
        case 'transcription':
          if (message.text) {
            this.callbacks.onTranscription?.(message.text);
          }
          break;

        case 'ai_response':
          if (message.text) {
            this.callbacks.onAIResponse?.(message.text);
          }
          break;

        case 'audio_response':
          if (message.audio_data) {
            try {
              const audioBytes = this.base64ToUint8Array(message.audio_data);
              this.callbacks.onAudioResponse?.(audioBytes);
            } catch (e) {
              console.error('❌ Audio data decode error:', e);
            }
          }
          break;

        case 'status':
          if (message.message) {
            this.callbacks.onStatus?.(message.message);
          }
          break;

        case 'error':
          if (message.message) {
            this.callbacks.onError?.(message.message);
          }
          break;

        case 'pong':
          console.log('💓 Pong received');
          break;

        default:
          console.warn('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      this.callbacks.onError?.('Message handling error');
    }
  }

  public sendAudioData(audioData: Uint8Array): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('No WebSocket connection');
    }

    try {
      const base64Audio = this.uint8ArrayToBase64(audioData);
      const message = {
        type: 'audio_data',
        audio_data: base64Audio,
        timestamp: new Date().toISOString()
      };

      this.ws.send(JSON.stringify(message));
      console.log('🎤 Audio data sent:', audioData.length, 'bytes');
    } catch (error) {
      console.error('❌ Audio send error:', error);
      throw error;
    }
  }

  public testAI(text: string): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('No WebSocket connection');
    }

    try {
      const message = {
        type: 'test_ai',
        text: text,
        timestamp: new Date().toISOString()
      };

      this.ws.send(JSON.stringify(message));
      console.log('🧪 AI test message sent:', text);
    } catch (error) {
      console.error('❌ AI test error:', error);
      throw error;
    }
  }

  private ping(): void {
    if (this.isConnected && this.ws) {
      const message = {
        type: 'ping',
        timestamp: new Date().toISOString()
      };
      this.ws.send(JSON.stringify(message));
      console.log('💓 Ping sent');
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.ping();
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

    console.log(`🔄 Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} - retrying in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }

  public disconnect(): void {
    console.log('🔌 Closing WebSocket connection...');
    
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.isConnected = false;
    this.callbacks.onConnectionChange?.(false);
  }

  public getConnectionStatus(): { connected: boolean; clientId: string; attempts: number } {
    return {
      connected: this.isConnected,
      clientId: this.clientId,
      attempts: this.reconnectAttempts
    };
  }

  // Helper functions
  private uint8ArrayToBase64(array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < array.byteLength; i++) {
      binary += String.fromCharCode(array[i]);
    }
    return window.btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

export default WebSocketService;
