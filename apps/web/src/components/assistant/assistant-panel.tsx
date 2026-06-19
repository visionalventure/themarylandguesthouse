'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, Send, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAssistant, type Message } from './use-assistant';

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm',
      )}>
        {(() => { const lines = msg.content.split('\n'); return lines.map((line, i) => (
          <span key={i}>{line}{i < lines.length - 1 && <br />}</span>
        )); })()}
      </div>
    </div>
  );
}

export function AssistantPanel({ open, onClose }: AssistantPanelProps) {
  const pathname = usePathname();
  const { messages, loading, send, clear, quickSuggestions } = useAssistant();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    send(text, pathname);
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Maryland Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clear}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[260px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center pt-2">
              Hi! I'm your ERP assistant. Ask me anything about using the system.
            </p>
            <div className="space-y-2">
              {quickSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => send(s, pathname)}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-2 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask anything…"
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
