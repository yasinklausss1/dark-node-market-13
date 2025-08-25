import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OnlineUser {
  user_id: string;
  username: string;
  last_seen: string;
  is_online: boolean;
}

export const useUserPresence = () => {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel('user_presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track current user presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: OnlineUser[] = [];
      
      Object.keys(state).forEach((key) => {
        const presences = state[key] as any[];
        presences.forEach((presence) => {
          users.push({
            user_id: presence.user_id,
            username: presence.username,
            last_seen: new Date().toISOString(),
            is_online: true
          });
        });
      });
      
      setOnlineUsers(users);
      setOnlineCount(users.length);
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('User joined:', newPresences);
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('User left:', leftPresences);
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const presenceTrackStatus = await channel.track({
          user_id: user.id,
          username: profile.username,
          online_at: new Date().toISOString(),
        });
        console.log('Presence track status:', presenceTrackStatus);
      }
    });

    // Update database presence every 30 seconds
    const updatePresence = async () => {
      if (user && profile) {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: user.id,
            username: profile.username,
            last_seen: new Date().toISOString(),
            is_online: true,
          });
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000);

    // Cleanup on page unload
    const handleBeforeUnload = async () => {
      await supabase
        .from('user_presence')
        .update({ is_online: false })
        .eq('user_id', user.id);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
      channel.unsubscribe();
      // Mark user as offline when component unmounts
      if (user) {
        supabase
          .from('user_presence')
          .update({ is_online: false })
          .eq('user_id', user.id);
      }
    };
  }, [user, profile]);

  return { onlineUsers, onlineCount };
};