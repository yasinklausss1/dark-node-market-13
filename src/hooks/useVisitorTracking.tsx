import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useVisitorTracking = (page: string = '/unknown') => {
  const { user } = useAuth();
  const lastTrackedUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Track when:
    // 1. First time on page (lastTrackedUserId is undefined)
    // 2. User logs in (user.id changes from null to a value)
    // 3. User logs out (user.id changes from a value to null)
    
    const currentUserId = user?.id || null;
    
    // Skip if we already tracked this exact state
    if (lastTrackedUserId.current === currentUserId) {
      return;
    }
    
    const trackVisitor = async () => {
      try {
        lastTrackedUserId.current = currentUserId;
        
        // Get or create session ID
        let sessionId = sessionStorage.getItem('session_id');
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          sessionStorage.setItem('session_id', sessionId);
        }

        console.log(`Tracking visit: page=${page}, userId=${currentUserId}`);

        await supabase.functions.invoke('track-visitor', {
          body: {
            page,
            referrer: document.referrer || null,
            sessionId,
            userId: currentUserId
          }
        });
      } catch (error) {
        console.log('Tracking error (non-critical):', error);
      }
    };

    trackVisitor();
  }, [page, user?.id]);
};
