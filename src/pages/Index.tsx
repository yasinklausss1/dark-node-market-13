import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SplashScreen from '@/components/SplashScreen';

const Index = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenSplash, setHasSeenSplash] = useState(false);
  
  console.log('Index component loaded:', { user: !!user, loading });

  // Check if user has seen splash this session
  useEffect(() => {
    const seen = sessionStorage.getItem('splashSeen');
    if (seen) {
      setShowSplash(false);
      setHasSeenSplash(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashSeen', 'true');
    setShowSplash(false);
    setHasSeenSplash(true);
  };

  // Show splash for unauthenticated users who haven't seen it yet
  if (!loading && !user && showSplash && !hasSeenSplash) {
    return <SplashScreen onComplete={handleSplashComplete} duration={2800} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/marketplace" replace />;
  }

  return <Navigate to="/auth" replace />;
};

export default Index;
