import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: string;
}

/**
 * Subscribes to live chat messages for a thread between currentUserId and
 * otherUserId. Mirrors the channel name the backend broadcasts to in
 * chat.controller.ts (sendMessage): `chat:${[senderId, receiverId].sort().join('__')}`.
 *
 * This is additive — your existing REST polling/fetch for messages keeps
 * working exactly as before if Realtime isn't configured or the socket drops.
 */
export function useChatRealtime(
  currentUserId: string | undefined,
  otherUserId: string | undefined,
  onNewMessage: (msg: ChatMessage) => void
) {
  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    const threadChannel = [currentUserId, otherUserId].sort().join('__');
    const channel = supabase
      .channel(`chat:${threadChannel}`)
      .on('broadcast', { event: 'new_message' }, (payload) => {
        onNewMessage(payload.payload as ChatMessage);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId, onNewMessage]);
}