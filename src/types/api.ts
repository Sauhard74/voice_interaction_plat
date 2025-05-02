export interface Conversation {
  conversation_id: string;
  status: 'started' | 'processing' | 'completed' | 'error';
  start_time: string;
  end_time?: string;
  error_message?: string;
}

export interface TranscriptItem {
  speaker: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export interface AudioResponse {
  status: 'processing';
  message: string;
  audio_url: string;
}

export interface ConversationInitResponse {
  conversation_id: string;
  status: 'started';
  start_time: string;
} 