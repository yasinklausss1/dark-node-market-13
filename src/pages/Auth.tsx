import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';
import EmailVerificationModal from '@/components/auth/EmailVerificationModal';
import PasswordResetModal from '@/components/auth/PasswordResetModal';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'signin' || tab === 'signup' || tab === 'seller') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Process referral after successful authentication
  useEffect(() => {
    const processReferral = async () => {
      if (user && !loading) {
        const referrerUsername = localStorage.getItem('referrer_username');
        if (referrerUsername) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const { data, error } = await supabase.functions.invoke('process-referral-signup', {
                body: { referrerUsername },
                headers: {
                  Authorization: `Bearer ${session.access_token}`
                }
              });

              if (error) {
                console.error('Referral processing error:', error);
                toast({
                  title: "Referral Processing Failed",
                  description: error.message || "Could not process referral bonus",
                  variant: "destructive"
                });
              } else if (data?.success) {
                toast({
                  title: "🎉 Referral Bonus Applied!",
                  description: data.message || "You and your referrer both received 3 credits!",
                  duration: 5000
                });
                // Clear the referrer username after successful processing
                localStorage.removeItem('referrer_username');
              }
            }
          } catch (err) {
            console.error('Error processing referral:', err);
          }
        }
      }
    };

    processReferral();
  }, [user, loading, toast]);

  if (user && !loading && !showVerificationModal) {
    return <Navigate to="/marketplace" replace />;
  }

  const handleSignIn = async (identifier: string, password: string, isEmail: boolean) => {
    setIsLoading(true);

    const { error } = await signIn(identifier, password, isEmail);
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Successfully signed in",
        description: "Welcome back!"
      });
    }
    
    setIsLoading(false);
  };

  const handleUserSignUp = async (identifier: string, password: string, dateOfBirth: Date, isEmail: boolean) => {
    setIsLoading(true);

    const result: any = await signUp(identifier, password, false, dateOfBirth, isEmail);
    
    if (result?.needsVerification) {
      setVerificationEmail(result.email);
      setShowVerificationModal(true);
    } else if (result?.error) {
      let errorMessage = result.error.message;
      if (result.error.message.includes('User already registered')) {
        errorMessage = 'This username/email is already registered';
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Registration successful",
        description: "User account has been created!"
      });
    }
    
    setIsLoading(false);
  };

  const handleSellerSignUp = async (identifier: string, password: string, dateOfBirth: Date, isEmail: boolean) => {
    setIsLoading(true);

    const result: any = await signUp(identifier, password, true, dateOfBirth, isEmail);
    
    if (result?.needsVerification) {
      setVerificationEmail(result.email);
      setShowVerificationModal(true);
    } else if (result?.error) {
      let errorMessage = result.error.message;
      if (result.error.message.includes('User already registered')) {
        errorMessage = 'This username/email is already registered';
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Registration successful",
        description: "Seller account has been created!"
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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome</h1>
          <p className="text-muted-foreground">Sign in to your account or create a new one</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <SignInForm 
              onSubmit={handleSignIn}
              isLoading={isLoading}
              onForgotPassword={() => setShowPasswordResetModal(true)}
            />
          </TabsContent>

          <TabsContent value="signup">
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="user">User</TabsTrigger>
                <TabsTrigger value="seller">Seller</TabsTrigger>
              </TabsList>

              <TabsContent value="user">
                <SignUpForm
                  onSubmit={handleUserSignUp}
                  isLoading={isLoading}
                  title="Create User Account"
                  description="Sign up as a buyer"
                />
              </TabsContent>

              <TabsContent value="seller">
                <SignUpForm
                  onSubmit={handleSellerSignUp}
                  isLoading={isLoading}
                  title="Create Seller Account"
                  description="Sign up to sell products"
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        email={verificationEmail}
        onVerified={() => {
          setShowVerificationModal(false);
          setActiveTab('signin');
        }}
      />

      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
      />
    </div>
  );
};

export default Auth;