import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import SignInForm from '@/components/auth/SignInForm';
import { OracleLogo } from '@/components/OracleLogo';
import { MessageCircle, Users, Shield } from 'lucide-react';
import SplashScreen from '@/components/SplashScreen';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const {
    user,
    signIn,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Track visitor on page load
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        await supabase.functions.invoke('track-visitor', {
          body: {
            page: '/auth',
            referrer: document.referrer || null,
            sessionId: sessionStorage.getItem('session_id') || crypto.randomUUID()
          }
        });
        
        // Store session ID for this browser session
        if (!sessionStorage.getItem('session_id')) {
          sessionStorage.setItem('session_id', crypto.randomUUID());
        }
      } catch (error) {
        console.log('Tracking error (non-critical):', error);
      }
    };

    trackVisitor();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (user && !loading) {
    return <Navigate to="/marketplace" replace />;
  }

  // Show splash screen for unauthenticated users who haven't seen it
  if (!loading && !user && showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} duration={2800} />;
  }

  const handleSignIn = async (username: string, password: string) => {
    setIsLoading(true);
    const result = await signIn(username, password);
    if (result.error) {
      const description = (result as any).blocked ? result.error.message : (result as any).remainingAttempts !== undefined ? `${result.error.message}` : result.error.message;
      toast({
        title: (result as any).blocked ? "IP blockiert" : "Anmeldung fehlgeschlagen",
        description,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Erfolgreich angemeldet",
        description: "Willkommen zurück!"
      });
    }
    setIsLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary border-t-transparent"></div>
      </div>;
  }
  return <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-card">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] bg-noise" />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <div className="max-w-md space-y-8 animate-fade-in">
            <OracleLogo size="xl" animate className="justify-center" />
            
            <div className="space-y-4 text-center">
              <p className="text-lg text-muted-foreground font-body leading-relaxed">
                Der vertrauenswürdigste digitale Marktplatz. 
                Sicher, anonym und zuverlässig.
              </p>
            </div>

            {/* Features */}
            <div className="grid gap-4 pt-8">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Maximale Sicherheit</p>
                  <p className="text-sm text-muted-foreground">Verschlüsselte Transaktionen</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Verifizierte Verkäufer</p>
                  <p className="text-sm text-muted-foreground">Nur safelist da!</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center animate-fade-in mb-6">
            <OracleLogo size="xl" animate />
          </div>

          {/* Info cards */}
          <div className="space-y-4 animate-fade-in delay-100">
            <div className="p-5 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Um einen Account zu erhalten, schreibe auf Telegram:
                  </p>
                  <a href="https://t.me/OracleMarketSupport" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:text-primary/80 transition-colors">
                    @OracleMarketSupport
                  </a>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tritt unserer Community bei:
                  </p>
                  <a href="https://t.me/+yXmX6a5jYN4wMmU0" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:text-primary/80 transition-colors">
                    Oracle Market Chat →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Sign in form */}
          <div className="animate-fade-in delay-200">
            <SignInForm onSubmit={handleSignIn} isLoading={isLoading} />
          </div>

          {/* Footer */}
          
        </div>
      </div>
    </div>;
};
export default Auth;