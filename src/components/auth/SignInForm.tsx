import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

interface SignInFormProps {
  onSubmit: (username: string, password: string) => Promise<void>;
  isLoading: boolean;
}

const SignInForm: React.FC<SignInFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData.username, formData.password);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">
          Anmelden
        </h2>
        <p className="text-sm text-muted-foreground">
          Gib deine Zugangsdaten ein, um fortzufahren
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="signin-username" className="text-sm font-medium text-foreground">
            Benutzername
          </Label>
          <Input
            id="signin-username"
            name="username"
            type="text"
            placeholder="Dein Benutzername"
            value={formData.username}
            onChange={handleInputChange}
            required
            className="h-12 bg-card border-border focus:border-primary focus:ring-primary/20 transition-all"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">
            Passwort
          </Label>
          <div className="relative">
            <Input
              id="signin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Dein Passwort"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="h-12 pr-12 bg-card border-border focus:border-primary focus:ring-primary/20 transition-all"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <Button 
          type="submit" 
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-accent hover:shadow-accent-lg transition-all duration-300 group" 
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Anmeldung läuft...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Anmelden
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>
      </form>
    </div>
  );
};

export default SignInForm;
