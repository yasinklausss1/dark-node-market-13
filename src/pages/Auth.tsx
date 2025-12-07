import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import SignInForm from '@/components/auth/SignInForm';

const Auth = () => {
  const { user, signIn, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  if (user && !loading) {
    return <Navigate to="/marketplace" replace />;
  }

  const handleSignIn = async (username: string, password: string) => {
    setIsLoading(true);

    const { error } = await signIn(username, password);
    
    if (error) {
      toast({
        title: "Anmeldung fehlgeschlagen",
        description: error.message,
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-3xl font-bold font-cinzel">Oracle Market</h1>
          </div>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Um einen Account zu erhalten, schreibe auf Telegram:
          </p>
          <a 
            href="https://t.me/elmatzo" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline text-lg"
          >
            @elmatzo
          </a>
          <p className="text-xs text-muted-foreground mt-2">
            Dies dient der Sicherheit, um unbefugten Zugriff zu verhindern.
          </p>
        </div>

        <SignInForm
          onSubmit={handleSignIn}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default Auth;