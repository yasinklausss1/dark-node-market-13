import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gift, Loader2 } from 'lucide-react';

const InviteRedirect = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (username) {
      // Store referrer username in localStorage
      localStorage.setItem('referrer_username', username);
      console.log(`Referral detected: invited by ${username}`);
      
      // Redirect to auth page after short delay
      setTimeout(() => {
        navigate('/auth?tab=signup');
      }, 1500);
    } else {
      navigate('/auth');
    }
  }, [username, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <div className="flex justify-center">
          <div className="relative">
            <Gift className="w-16 h-16 text-primary animate-bounce" />
            <Loader2 className="w-6 h-6 text-primary/60 animate-spin absolute -bottom-2 -right-2" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          You've Been Invited! 🎉
        </h1>
        <p className="text-muted-foreground max-w-md">
          {username && (
            <>
              <span className="font-semibold text-foreground">{username}</span> has invited you to join Oracle Market.
              <br />
              You'll both receive <span className="font-semibold text-primary">3 credits</span> when you sign up!
            </>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          Redirecting to sign up...
        </p>
      </div>
    </div>
  );
};

export default InviteRedirect;
