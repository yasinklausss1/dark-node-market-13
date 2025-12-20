import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'user' | 'seller' | 'admin';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (username: string, password: string, isSeller?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user still exists in database and force logout if deleted
  const verifyUserExists = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error || !data) {
        console.log('User no longer exists in database, forcing logout');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error verifying user exists:', error);
      return false;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Verify user still exists before setting session
        const userExists = await verifyUserExists(session.user.id);
        if (!userExists) {
          // User was deleted, clear session
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            // Also verify on auth state change
            const userExists = await verifyUserExists(session.user.id);
            if (!userExists) {
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setProfile(null);
              return;
            }
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      // Use edge function for brute-force protected login
      const response = await fetch(
        'https://iqeubhhqdurqoaxnnyng.supabase.co/functions/v1/check-login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'login',
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (data.blocked) {
        return { error: new Error(data.message || 'IP blockiert'), blocked: true };
      }

      if (!response.ok) {
        return { 
          error: new Error(data.message || data.error || 'Anmeldung fehlgeschlagen'),
          remainingAttempts: data.remainingAttempts
        };
      }

      // Set the session from edge function response
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      return { error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { error: new Error('Verbindungsfehler. Versuche es später erneut.') };
    }
  };

  const signUp = async (username: string, password: string) => {
    // Generate email from username
    const email = `${username}@example.com`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          username,
          role: 'seller'
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Always clear local state, even if signOut fails (e.g., session already expired)
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Clear notification timestamps from localStorage
      localStorage.removeItem('lastSeenOrders');
      localStorage.removeItem('lastSeenReports');
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);
    
    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }
    
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};