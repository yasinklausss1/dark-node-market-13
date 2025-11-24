import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

// Validation schema
const signInSchema = z.object({
  identifier: z.string()
    .trim()
    .min(1, 'Username or email is required')
    .refine(
      (value) => {
        // If contains @, validate as email
        if (value.includes('@')) {
          return z.string().email().safeParse(value).success;
        }
        // Otherwise validate as username (alphanumeric, underscore, 3-30 chars)
        return /^[a-zA-Z0-9_]{3,30}$/.test(value);
      },
      'Invalid username or email format'
    ),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
});

interface SignInFormProps {
  onSubmit: (identifier: string, password: string, isEmail: boolean) => Promise<void>;
  isLoading: boolean;
  onForgotPassword?: () => void;
}

const SignInForm: React.FC<SignInFormProps> = ({ onSubmit, isLoading, onForgotPassword }) => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with Zod
    const validation = signInSchema.safeParse(formData);
    
    if (!validation.success) {
      const fieldErrors: { identifier?: string; password?: string } = {};
      validation.error.errors.forEach((error) => {
        const field = error.path[0] as 'identifier' | 'password';
        fieldErrors[field] = error.message;
      });
      setErrors(fieldErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    // Check if identifier is an email
    const isEmail = formData.identifier.includes('@');
    await onSubmit(formData.identifier, formData.password, isEmail);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Sign in with your credentials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-identifier">Username or Email</Label>
            <Input
              id="signin-identifier"
              name="identifier"
              type="text"
              placeholder="Username or E-Mail"
              value={formData.identifier}
              onChange={handleInputChange}
              className={errors.identifier ? 'border-destructive' : ''}
            />
            {errors.identifier && (
              <p className="text-sm text-destructive">{errors.identifier}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <div className="relative">
              <Input
                id="signin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'border-destructive' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
            {onForgotPassword && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm h-auto"
                  onClick={onForgotPassword}
                >
                  Forgot password?
                </Button>
              </div>
            )}
          </div>
          
          <Button
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            variant="auth"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SignInForm;