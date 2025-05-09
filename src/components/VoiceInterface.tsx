import { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, PhoneIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { api } from '@/services/api';

export default function VoiceInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('Kshitij Sir');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Initialize new conversation when component mounts
  useEffect(() => {
    api.startConversation()
      .then(res => {
        setConversationId(res.conversation_id);
        console.log("Conversation initialized with ID:", res.conversation_id);
      })
      .catch(err => {
        console.error("Failed to start conversation:", err);
        toast.error('Failed to connect to AI service');
      });
  }, []);

  // Function to start recording
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
        
        // Send recording to backend for processing
        if (conversationId) {
          handleSendAudioToBackend(audioBlob);
        } else {
          toast.error('Connection to AI service not established');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      toast.error('Failed to start recording');
      console.error('Error starting recording:', error);
    }
  };

  // Function to send audio to backend and play response
  const handleSendAudioToBackend = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      toast.loading('Processing your message...', { id: 'processing' });
      console.log("Sending audio to backend at:", process.env.NEXT_PUBLIC_API_BASE_URL);
      
      const response = await api.sendAudio(conversationId!, audioBlob);
      console.log("Response from backend:", response);
      
      // Store AI response text
      setAiResponse(response.message);
      toast.success('Response received', { id: 'processing' });
      
      // Play TTS audio response
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const audioPath = response.audio_url.startsWith('/') ? response.audio_url : `/${response.audio_url}`;
      const audioEndpoint = `${base}${audioPath}`;
      console.log("Playing audio from:", audioEndpoint);
      setAudioUrl(audioEndpoint);
      
      // Create or update audio player
      if (!audioPlayerRef.current) {
        const audioElement = document.createElement('audio');
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        audioPlayerRef.current = audioElement;
      }
      
      audioPlayerRef.current.src = audioEndpoint;
      await audioPlayerRef.current.play().catch(error => {
        console.error("Audio playback error:", error);
        toast.error("Couldn't play audio response");
      });
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error('Failed to process your message', { id: 'processing' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (mediaRecorderRef.current && isRecording) {
      // Implement mute functionality for the active recording if needed
      toast.success(isMuted ? 'Microphone unmuted' : 'Microphone muted');
    }
  };

  // Handle hang up
  const handleHangUp = () => {
    stopRecording();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    toast.success('Call ended');
  };

  return (
    <div className="flex flex-col items-center justify-between h-screen gradient-bg p-0">
      {/* Container to limit width on mobile */}
      <div className="flex flex-col items-center justify-between h-full w-full max-w-md mx-auto py-12">
        {/* Top section with avatar and name */}
        <div className="flex flex-col items-center mb-16 mt-8">
          <div className="avatar-container mb-6 relative w-[80px] h-[80px]">
            <Image 
              src="/character-avatar.svg"
              alt="Character Avatar" 
              fill
              priority
              sizes="80px"
              className="rounded-full object-cover"
            />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{characterName}</h2>
          <p className="text-lg text-gray-300">plebz.ai</p>
        </div>

        {/* Middle section with audio wave and button */}
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className={`audio-wave mb-8 ${isRecording ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          {aiResponse && !isRecording && !isProcessing && (
            <div className="text-white text-center mb-4 bg-gray-800 bg-opacity-50 p-4 rounded-lg max-w-xs">
              <p>{aiResponse}</p>
            </div>
          )}
          
          {isProcessing && (
            <div className="text-white text-center mb-4">
              <p>Processing...</p>
            </div>
          )}
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className="btn-speaking"
          >
            {isRecording ? 'Stop speaking' : isProcessing ? 'Processing...' : 'Start speaking'}
          </button>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-center space-x-8 mb-12">
          <button 
            onClick={toggleMute} 
            className="btn-round btn-mute"
          >
            <MicrophoneIcon className="h-5 w-5" />
            <span className="sr-only">Mute</span>
          </button>
          <button 
            onClick={handleHangUp} 
            className="btn-round btn-hangup"
          >
            <PhoneIcon className="h-5 w-5" />
            <span className="sr-only">Hang up</span>
          </button>
        </div>
      </div>
    </div>
  );
}