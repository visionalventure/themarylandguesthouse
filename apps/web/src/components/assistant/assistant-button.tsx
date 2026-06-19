'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { AssistantPanel } from './assistant-panel';

export function AssistantButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Maryland Assistant"
      >
        {open ? <X className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
      </button>
      <AssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
