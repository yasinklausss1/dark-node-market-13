import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Gift } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SignUpFormProps {
  onSubmit: (identifier: string, password: string, dateOfBirth: Date, isEmail: boolean) => Promise<void>;
  isLoading: boolean;
  title: string;
  description: string;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, isLoading, title, description }) => {
  const [registrationType, setRegistrationType] = useState<'username' | 'email'>('email');
  const [formData, setFormData] = useState({
    password: '',
    identifier: '', // username or email
    confirmPassword: ''
  });
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [birthDay, setBirthDay] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [referrerUsername, setReferrerUsername] = useState<string | null>(null);

  useEffect(() => {
    // Check if user was invited
    const storedReferrer = localStorage.getItem('referrer_username');
    if (storedReferrer) {
      setReferrerUsername(storedReferrer);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Clear errors when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate identifier (username or email)
    if (!formData.identifier.trim()) {
      newErrors.identifier = registrationType === 'email' ? 'Email is required' : 'Username is required';
    } else if (registrationType === 'email') {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.identifier)) {
        newErrors.identifier = 'Please enter a valid email address';
      }
    } else {
      // Username validation
      if (formData.identifier.length < 3 || formData.identifier.length > 30) {
        newErrors.identifier = 'Username must be between 3 and 30 characters';
      }
      if (!/^[a-zA-Z0-9_]+$/.test(formData.identifier)) {
        newErrors.identifier = 'Username can only contain letters, numbers, and underscores';
      }
    }

    if (formData.password.length < 7) {
      newErrors.password = 'Password must be at least 7 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate date of birth
    if (!birthDay || !birthMonth || !birthYear) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();
      
      const isUnder18 = age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)));
      
      if (isUnder18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old to register';
      }
      
      // Set the dateOfBirth state for submission
      setDateOfBirth(dob);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!dateOfBirth) {
      return;
    }

    await onSubmit(formData.identifier, formData.password, dateOfBirth, registrationType === 'email');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {referrerUsername && (
          <Alert className="mb-4 bg-primary/10 border-primary/20">
            <Gift className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              🎉 You've been invited by <span className="font-semibold">{referrerUsername}</span>! 
              You'll both receive <span className="font-semibold">3 credits</span> when you complete registration.
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={registrationType} onValueChange={(v) => setRegistrationType(v as 'username' | 'email')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="username">Username</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-2 mt-4">
              <Label htmlFor="signup-email">Email Address</Label>
              <Input
                id="signup-email"
                name="identifier"
                type="email"
                placeholder="your.email@example.com"
                value={formData.identifier}
                onChange={handleInputChange}
                required
                className={errors.identifier ? 'border-destructive' : ''}
              />
              {errors.identifier && (
                <p className="text-sm text-destructive">{errors.identifier}</p>
              )}
              <p className="text-xs text-muted-foreground">
                You'll receive a verification email after registration
              </p>
            </TabsContent>

            <TabsContent value="username" className="space-y-2 mt-4">
              <Label htmlFor="signup-username">Username</Label>
              <Input
                id="signup-username"
                name="identifier"
                type="text"
                placeholder="YourUsername"
                value={formData.identifier}
                onChange={handleInputChange}
                required
                className={errors.identifier ? 'border-destructive' : ''}
              />
              {errors.identifier && (
                <p className="text-sm text-destructive">{errors.identifier}</p>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password (min. 7 characters)</Label>
            <div className="relative">
              <Input
                id="signup-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Choose a secure password"
                value={formData.password}
                onChange={handleInputChange}
                required
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
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signup-confirm">Confirm Password</Label>
            <Input
              id="signup-confirm"
              name="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-dob">Date of Birth</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select value={birthDay} onValueChange={setBirthDay}>
                <SelectTrigger className={errors.dateOfBirth ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={birthMonth} onValueChange={setBirthMonth}>
                <SelectTrigger className={errors.dateOfBirth ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={birthYear} onValueChange={setBirthYear}>
                <SelectTrigger className={errors.dateOfBirth ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 18 - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.dateOfBirth && (
              <p className="text-sm text-destructive">{errors.dateOfBirth}</p>
            )}
            <p className="text-xs text-muted-foreground">
              You must be at least 18 years old to create an account
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            variant="auth"
          >
            {isLoading ? "Registering..." : "Register"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SignUpForm;