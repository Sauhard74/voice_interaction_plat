import { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, PhoneIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export default function VoiceInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('Kshitij Sir');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

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
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Create audio element if it doesn't exist
        if (!audioPlayerRef.current) {
          const audioElement = document.createElement('audio');
          audioElement.style.display = 'none';
          document.body.appendChild(audioElement);
          audioPlayerRef.current = audioElement;
        }
        
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = url;
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
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className="btn-speaking"
          >
            {isRecording ? 'Stop speaking' : 'Start speaking'}
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