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
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await assistantApi.chat(content, { page });
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.data.reply,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I could not connect to the assistant. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, loading, send, clear, quickSuggestions: QUICK_SUGGESTIONS };
}
