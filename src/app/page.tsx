'use client';

import { Toaster } from 'react-hot-toast';

import AudioInterface from '@/components/AudioInterface';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    
        <AudioInterface />
      </div>
      <Toaster position="bottom-right" />
    </main>
  );
}
