import { useState, useRef } from 'react';
import { MicrophoneIcon, StopIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';

export default function AudioInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const playAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
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

          {audioUrl && (
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="h-6 w-6 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon className="h-6 w-6 mr-2" />
                  Play
                </>
              )}
            </button>
          )}
        </div>

        {/* Audio Quality Info */}
        {audioUrl && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Audio Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Format</p>
                <p className="font-medium">WebM</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium">
                  {audioPlayerRef.current?.duration
                    ? `${Math.round(audioPlayerRef.current.duration)}s`
                    : 'Calculating...'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 