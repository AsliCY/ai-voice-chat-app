// src/services/AudioService.ts - Improved version
export interface AudioServiceCallbacks {
  onRecordingStart?: () => void;
  onRecordingStop?: (audioData: Uint8Array) => void;
  onRecordingError?: (error: string) => void;
}

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private callbacks: AudioServiceCallbacks = {};
  private isRecording = false;

  public setCallbacks(callbacks: AudioServiceCallbacks) {
    this.callbacks = callbacks;
  }

  public async initialize(): Promise<boolean> {
    try {
      console.log('🎤 Requesting microphone access...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimized for Deepgram
          channelCount: 1,
        }
      });

      console.log('✅ Microphone access granted');
      return true;

    } catch (error) {
      console.error('❌ Failed to get microphone access:', error);
      this.callbacks.onRecordingError?.('Microphone permission is required');
      return false;
    }
  }

  public async startRecording(): Promise<void> {
    if (!this.stream) {
      throw new Error('No audio stream available. Call initialize() first.');
    }

    if (this.isRecording) {
      console.warn('⚠️ Already recording');
      return;
    }

    try {
      this.audioChunks = [];

      // Most compatible format for Deepgram
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 // 16kbps, sufficient for voice quality
      };

      // Fallback MIME types - for Deepgram compatibility
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        } else {
          console.log('⚠️ Using default MIME type');
          delete options.mimeType;
        }
      }

      console.log('🎙️ Using MIME type:', options.mimeType);
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log('📦 Received audio chunk:', event.data.size, 'bytes');
        }
      };

      this.mediaRecorder.onstop = async () => {
        try {
          console.log('🔄 Merging audio chunks...', this.audioChunks.length, 'chunks');
          
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          
          console.log('📊 Final audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
          
          if (audioBlob.size === 0) {
            throw new Error('Empty audio data');
          }

          if (audioBlob.size < 1000) {
            console.warn('⚠️ Audio file too small:', audioBlob.size, 'bytes');
          }

          const audioData = await this.blobToUint8Array(audioBlob);
          
          console.log('🎙️ Recording complete:', audioData.length, 'bytes');
          this.callbacks.onRecordingStop?.(audioData);
        } catch (error) {
          console.error('❌ Error processing recording:', error);
          this.callbacks.onRecordingError?.('Recording processing error');
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        this.callbacks.onRecordingError?.('Recording error');
      };

      // Start recording - more frequent chunks
      this.mediaRecorder.start(250); // Create chunk every 250ms
      this.isRecording = true;
      
      console.log('🎙️ Recording started, MIME type:', this.mediaRecorder.mimeType);
      this.callbacks.onRecordingStart?.();

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.callbacks.onRecordingError?.('Failed to start recording');
      throw error;
    }
  }

  public stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn('⚠️ No active recording');
      return;
    }

    try {
      console.log('⏹️ Stopping recording...');
      this.mediaRecorder.stop();
      this.isRecording = false;
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      this.callbacks.onRecordingError?.('Failed to stop recording');
    }
  }

  public async playAudio(audioData: Uint8Array): Promise<void> {
    try {
      console.log('🔊 Playing audio...', audioData.length, 'bytes');

      // ElevenLabs usually returns MP3
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          console.log('✅ Audio playback finished');
          resolve();
        };

        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          console.error('❌ Audio playback error:', error);
          reject(new Error('Failed to play audio'));
        };

        audio.play().catch(error => {
          URL.revokeObjectURL(audioUrl);
          console.error('❌ Error starting playback:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Audio playback error:', error);
      throw error;
    }
  }

  public getRecordingStatus(): { isRecording: boolean; isInitialized: boolean } {
    return {
      isRecording: this.isRecording,
      isInitialized: this.stream !== null
    };
  }

  public dispose(): void {
    console.log('🧹 Cleaning up AudioService...');

    if (this.isRecording) {
      this.stopRecording();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  // Helper function
  private async blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  // Microphone test with enhanced logging
  public async testMicrophone(): Promise<boolean> {
    try {
      console.log('🧪 Starting microphone test...');

      if (!this.stream) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      // Record for 3 seconds
      await this.startRecording();
      
      return new Promise((resolve) => {
        setTimeout(() => {
          this.stopRecording();
          console.log('✅ Microphone test completed');
          resolve(true);
        }, 3000); // 3-second test
      });

    } catch (error) {
      console.error('❌ Microphone test failed:', error);
      return false;
    }
  }
}

export default AudioService;
