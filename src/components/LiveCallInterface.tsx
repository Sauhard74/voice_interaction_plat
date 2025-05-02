import { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, PhoneXMarkIcon } from '@heroicons/react/24/solid';
import { api } from '@/services/api';
import { TranscriptItem } from '@/types/api';

const WS_ENDPOINT = 'wss://your-backend/ws/conversation'; // TODO: Replace with your actual endpoint

export default function LiveCallInterface() {
  const [isMuted, setIsMuted] = useState(false);
  const [isOnCall, setIsOnCall] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const userMsgIdxRef = useRef<number | null>(null);

  // Placeholder avatar and name
  const avatarUrl = 'https://randomuser.me/api/portraits/men/1.jpg'; // Replace with character avatar
  const characterName = 'Elon Musk'; // Replace with dynamic name
  const brand = 'character.ai';

  // Start a conversation on mount
  if (!conversationId && typeof window !== 'undefined') {
    api.startConversation().then(res => setConversationId(res.conversation_id));
  }

  // Open WebSocket connection on mount
  useEffect(() => {
    const ws = new WebSocket(WS_ENDPOINT);
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'transcript') {
          // If this is a user transcript, update the last user message
          if (msg.speaker === 'user' && userMsgIdxRef.current !== null) {
            setTranscript((prev) => {
              const updated = [...prev];
              updated[userMsgIdxRef.current!] = {
                ...updated[userMsgIdxRef.current!],
                text: msg.text,
              };
              return updated;
            });
            userMsgIdxRef.current = null;
          } else {
            setTranscript((prev) => [
              ...prev,
              {
                speaker: msg.speaker,
                text: msg.text,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        } else if (msg.type === 'audio' && msg.url) {
          setAiIsSpeaking(true);
          if (!audioPlayerRef.current) {
            const audioElement = document.createElement('audio');
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
            audioPlayerRef.current = audioElement;
          }
          if (audioPlayerRef.current) {
            audioPlayerRef.current.src = msg.url;
            audioPlayerRef.current.onended = () => setAiIsSpeaking(false);
            audioPlayerRef.current.play();
          }
        }
      } catch {
        // If not JSON, assume it's binary audio chunk
        if (audioPlayerRef.current) {
          const blob = new Blob([event.data], { type: 'audio/webm' });
          audioPlayerRef.current.src = URL.createObjectURL(blob);
          audioPlayerRef.current.onended = () => setAiIsSpeaking(false);
          audioPlayerRef.current.play();
        }
      }
    };
    ws.onclose = () => {
      wsRef.current = null;
    };
    return () => {
      ws.close();
    };
  }, []);

  const handleMuteToggle = () => setIsMuted((m) => !m);
  const handleHangUp = () => setIsOnCall(false);

  // Microphone logic
  const startRecording = async () => {
    if (isMuted || !wsRef.current || wsRef.current.readyState !== 1) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Optimistically add user message to transcript
      setTranscript((prev) => {
        const idx = prev.length;
        userMsgIdxRef.current = idx;
        return [
          ...prev,
          {
            speaker: 'user',
            text: '[User speaking...]',
            timestamp: new Date().toISOString(),
          },
        ];
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current && wsRef.current.readyState === 1) {
          event.data.arrayBuffer().then((buffer) => {
            wsRef.current?.send(buffer);
          });
        }
      };

      mediaRecorder.onstop = () => {
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(JSON.stringify({ type: 'end' }));
        }
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250); // send chunks every 250ms
      setIsRecording(true);
    } catch (error) {
      // Handle error
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (!isOnCall) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-blue-900">
        <h2 className="text-3xl text-white font-bold mb-4">Call Ended</h2>
        <button
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => setIsOnCall(true)}
        >
          Rejoin Call
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-blue-900">
      <img
        src={avatarUrl}
        alt="Avatar"
        className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg mb-6"
      />
      <div className="text-white text-2xl font-semibold mb-2">{characterName}</div>
      <div className="text-white text-3xl font-bold mb-8 tracking-wide">{brand}</div>
      <div className="text-blue-200 text-lg mb-12">
        {aiIsSpeaking ? 'AI Speaking...' : isRecording ? 'Listening...' : 'Idle'}
      </div>
      {/* Transcript/chat history */}
      <div className="w-full max-w-xl h-64 overflow-y-auto bg-gray-800 bg-opacity-60 rounded-lg p-4 mb-8">
        {transcript.map((item, idx) => (
          <div
            key={idx}
            className={`mb-3 flex ${item.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-[70%] text-white text-base ${
                item.speaker === 'user' ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span className="block font-semibold text-xs mb-1 opacity-70">
                {item.speaker === 'user' ? 'You' : characterName}
              </span>
              {item.text}
            </div>
          </div>
        ))}
      </div>
      {/* Controls */}
      <div className="flex space-x-12 items-center">
        <button
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          disabled={isMuted || aiIsSpeaking}
          className={`flex flex-col items-center focus:outline-none ${isMuted || aiIsSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <MicrophoneIcon
            className={`h-14 w-14 bg-gray-700 rounded-full p-3 mb-2 ${isRecording ? 'text-green-400 animate-pulse' : isMuted ? 'text-red-500 opacity-50' : 'text-white'}`}
          />
          <span className="text-white text-sm">{isMuted ? 'Muted' : isRecording ? 'Release to Send' : 'Hold to Talk'}</span>
        </button>
        <button
          onClick={handleMuteToggle}
          className="flex flex-col items-center focus:outline-none"
        >
          <span className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${isMuted ? 'bg-red-600' : 'bg-gray-700'}`}>
            <MicrophoneIcon className={`h-6 w-6 ${isMuted ? 'text-white opacity-50' : 'text-white'}`} />
          </span>
          <span className="text-white text-sm">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button
          onClick={handleHangUp}
          className="flex flex-col items-center focus:outline-none"
        >
          <PhoneXMarkIcon className="h-14 w-14 text-white bg-red-600 rounded-full p-3 mb-2 hover:bg-red-700 transition-colors" />
          <span className="text-white text-sm">Hang up</span>
        </button>
      </div>
    </div>
  );
} 