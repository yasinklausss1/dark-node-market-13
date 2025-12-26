import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from 'lucide-react';

interface UserProfile {
  user_id: string;
  username: string;
}

export const OnlineUsersMarquee = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setUsers(data);
      }
    };

    fetchUsers();

    // Subscribe to profile changes
    const channel = supabase
      .channel('profiles-marquee')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' }, 
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (users.length === 0) return null;

  // Duplicate users for seamless infinite scroll
  const duplicatedUsers = [...users, ...users];

  return (
    <div className="relative overflow-hidden border-y border-border/50 bg-muted/30 py-2">
      <div className="flex w-max animate-marquee">
        {duplicatedUsers.map((user, index) => (
          <div
            key={`${user.user_id}-${index}`}
            className="inline-flex items-center gap-1.5 mx-4 text-sm text-muted-foreground shrink-0"
          >
            <User className="h-3.5 w-3.5" />
            <span>{user.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
