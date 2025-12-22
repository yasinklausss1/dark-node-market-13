import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useVisitorTracking = (page: string = '/unknown') => {
  const { user } = useAuth();
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (hasTracked.current) return;
    
    const trackVisitor = async () => {
      try {
        hasTracked.current = true;
        
        // Get or create session ID
        let sessionId = sessionStorage.getItem('session_id');
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          sessionStorage.setItem('session_id', sessionId);
        }

        await supabase.functions.invoke('track-visitor', {
          body: {
            page,
            referrer: document.referrer || null,
            sessionId,
            userId: user?.id || null
          }
        });
      } catch (error) {
        console.log('Tracking error (non-critical):', error);
      }
    };

    trackVisitor();
  }, [page, user?.id]);
};
