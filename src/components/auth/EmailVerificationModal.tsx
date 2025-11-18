import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerified: () => void;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  email,
  onVerified
}) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 4) {
      toast.error('Please enter a 4-digit code');
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-code', {
        body: { email, code }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Email verified! You can now sign in.');
        onVerified();
        onClose();
      } else {
        toast.error(data?.error || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error('Failed to verify code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Your Email</DialogTitle>
          <DialogDescription>
            We've sent a 4-digit verification code to <strong>{email}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              value={code}
              onChange={handleCodeChange}
              placeholder="0000"
              maxLength={4}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Enter the 4-digit code sent to your email
            </p>
          </div>
          <Button
            onClick={handleVerify}
            disabled={isVerifying || code.length !== 4}
            className="w-full"
          >
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailVerificationModal;
