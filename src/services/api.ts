import axios from 'axios';
import { Conversation, ConversationInitResponse, AudioResponse, TranscriptItem } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const api = {
  // Initialize a new conversation
  async startConversation(agentId?: string): Promise<ConversationInitResponse> {
    const response = await axios.post(`${API_BASE_URL}/conversations`, 
      // Only send data if agentId is provided
      agentId ? { agent_id: agentId } : {});
    return response.data;
  },

  // Send audio data
  async sendAudio(conversationId: string, audioBlob: Blob): Promise<AudioResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await axios.post(
      `${API_BASE_URL}/conversations/${conversationId}/audio`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get conversation status
  async getConversationStatus(conversationId: string): Promise<Conversation> {
    const response = await axios.get(`${API_BASE_URL}/conversations/${conversationId}`);
    return response.data;
  },

  // Get conversation transcript
  async getTranscript(conversationId: string): Promise<TranscriptItem[]> {
    const response = await axios.get(`${API_BASE_URL}/conversations/${conversationId}/transcript`);
    return response.data;
  }
};