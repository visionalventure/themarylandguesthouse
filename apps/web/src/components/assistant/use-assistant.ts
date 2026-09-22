import { useState, useCallback } from 'react';
import { assistantApi } from '@/lib/api';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_SUGGESTIONS = [
  'How do I check in a guest?',
  'What is RevPAR?',
  'How does night audit work?',
  'How do I post a charge to a folio?',
];

export function useAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (content: string, page?: string) => {
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await assistantApi.chat(content, { page });
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.data.reply,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message;
      const statusCode = err?.response?.status;
      const fallback = err?.request && !err?.response
        ? 'Sorry, the assistant could not be reached (network error). Please try again.'
        : statusCode
          ? `Sorry, the assistant returned an error (HTTP ${statusCode}). Please try again.`
          : 'Sorry, I could not connect to the assistant. Please try again.';
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: serverMessage || fallback,
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, loading, send, clear, quickSuggestions: QUICK_SUGGESTIONS };
}
