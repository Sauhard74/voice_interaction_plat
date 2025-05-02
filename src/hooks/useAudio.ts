import { useState, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';

export const useAudio = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Initialize conversation if not already started
      if (!conversationId) {
        const response = await api.startConversation();
        setConversationId(response.conversation_id);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (conversationId) {
          try {
            const response = await api.sendAudio(conversationId, audioBlob);
            if (response.audio_url) {
              if (audioPlayerRef.current) {
                audioPlayerRef.current.src = response.audio_url;
                audioPlayerRef.current.play();
                setIsPlaying(true);
              }
            }
          } catch (error) {
            toast.error('Failed to process audio');
            console.error('Error sending audio:', error);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Failed to start recording');
      console.error('Error starting recording:', error);
    }
  }, [conversationId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  const playAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pauseAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  return {
    isRecording,
    isPlaying,
    startRecording,
    stopRecording,
    playAudio,
    pauseAudio,
    audioPlayerRef,
  };
}; 