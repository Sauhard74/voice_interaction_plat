import { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';

export default function AudioInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Initialize new conversation on mount
  useEffect(() => {
    api.startConversation()
      .then(res => setConversationId(res.conversation_id))
      .catch(err => toast.error('Failed to start conversation'));
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // stop and send to backend for processing
        if (conversationId) handleSendAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      toast.error('Failed to start recording');
      console.error('Error starting recording:', error);
    }
  };

  // handle sending audio to backend and playing the TTS response
  const handleSendAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setPlaybackError(null);
    try {
      console.log("Sending audio to backend at:", process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000');
      const response = await api.sendAudio(conversationId!, audioBlob);
      console.log("Response from backend:", response);
      toast.success('Response received');
      
      // play TTS audio from backend
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const audioPath = response.audio_url.startsWith('/') ? response.audio_url : `/${response.audio_url}`;
      const audioEndpoint = `${base}${audioPath}`;
      console.log("Playing audio from:", audioEndpoint);
      setAudioUrl(audioEndpoint);
      
      if (!audioPlayerRef.current) {
        const el = document.createElement('audio');
        el.addEventListener('error', (e) => {
          console.error("Audio playback error:", e);
          setPlaybackError(`Failed to load audio: ${(e.target as HTMLAudioElement).error?.message || 'Unknown error'}`);
        });
        el.style.display = 'none';
        document.body.appendChild(el);
        audioPlayerRef.current = el;
      }
      
      audioPlayerRef.current.src = audioEndpoint;
      
      try {
        await audioPlayerRef.current.play();
      } catch (playError) {
        console.error("Audio play error:", playError);
        setPlaybackError(`Failed to play audio: ${playError instanceof Error ? playError.message : 'Unknown error'}`);
        throw playError;
      }
    } catch (error) {
      toast.error(`Error processing audio: ${error instanceof Error ? error.message : "Unknown error"}`);
      console.error("Audio processing error details:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  return (
    <div className="h-full p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Audio Interface</h2>
      
      <div className="flex flex-col items-center justify-center h-[calc(100%-4rem)]">
        {/* Audio Visualization */}
        <div className="w-full h-32 bg-gray-100 rounded-lg mb-8 flex items-center justify-center">
          {isRecording ? (
            <div className="animate-pulse text-red-500">
              <MicrophoneIcon className="h-12 w-12" />
            </div>
          ) : (
            <div className="text-gray-400">
              <MicrophoneIcon className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MicrophoneIcon className="h-6 w-6 mr-2" />
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <StopIcon className="h-6 w-6 mr-2" />
              Stop Recording
            </button>
          )}
          {isProcessing && <span className="text-gray-500">Processing...</span>}
        </div>
        
        {/* Audio player for debugging */}
        {audioUrl && (
          <div className="mt-6 w-full">
            <h3 className="text-lg font-semibold mb-2">AI Response</h3>
            <audio 
              src={audioUrl} 
              controls 
              className="w-full mt-2" 
              onError={(e) => setPlaybackError(`Error loading audio: ${(e.target as HTMLAudioElement).error?.message}`)}
            />
            {playbackError && (
              <p className="text-red-500 mt-2">{playbackError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}