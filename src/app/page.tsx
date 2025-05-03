'use client';

import { Toaster } from 'react-hot-toast';
import VoiceInterface from '@/components/VoiceInterface';

export default function Home() {
  return (
    <main className="min-h-screen">
      <VoiceInterface />
      <Toaster position="bottom-right" />
    </main>
  );
}
