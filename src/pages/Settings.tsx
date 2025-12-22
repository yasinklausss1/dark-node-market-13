import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Moon, Sun, Trash2, Shield, Download, ExternalLink, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Track visitor with user association
  useVisitorTracking('/settings');

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        method: 'POST'
      });

      if (error) {
        throw error;
      }

      await signOut();
      
      toast({
        title: 'Konto gelöscht',
        description: 'Dein Konto wurde erfolgreich gelöscht.',
      });

      navigate('/auth');
    } catch (error) {
      console.error('Fehler beim Löschen des Kontos:', error);
      toast({
        title: 'Fehler',
        description: 'Das Konto konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl">
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-1 sm:gap-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Zurück</span>
          </Button>
          <h1 className="text-xl sm:text-3xl font-bold truncate">Einstellungen</h1>
        </div>

      <div className="space-y-6">

        {/* Privacy & Security Guide */}
        <Card id="privacy-guide">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Datenschutz & Anonymität
            </CardTitle>
            <CardDescription>
              Richtlinien für anonyme und sichere Plattformnutzung
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Tor Browser verwenden</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Der Tor Browser leitet deinen Datenverkehr über mehrere Server und verschleiert deine IP-Adresse.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.torproject.org/download/" target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Tor Browser herunterladen
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. VPN-Anbieter</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Empfohlene VPN-Anbieter für zusätzliche Anonymität:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• <strong>Mullvad:</strong> Keine Logs, anonyme Zahlung möglich</li>
                  <li>• <strong>ProtonVPN:</strong> Schweizer Anbieter, starke Verschlüsselung</li>
                  <li>• <strong>IVPN:</strong> Keine-Logs-Richtlinie, anonyme Konten</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Bitcoin-Anonymität</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Bitcoin-Transaktionen sind öffentlich sichtbar. Verwende:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• <strong>Coin-Mixing-Dienste:</strong> Wasabi Wallet, Samourai Whirlpool</li>
                  <li>• <strong>Neue Adressen:</strong> Neue Bitcoin-Adresse für jede Transaktion verwenden</li>
                  <li>• <strong>Monero:</strong> Als alternative Kryptowährung (falls unterstützt)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Plattform-Verhalten</h4>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Verwende keine echten Namen als Benutzername</li>
                  <li>• Lösche und erstelle dein Konto regelmäßig neu</li>
                  <li>• Verwende keine Passwörter wieder</li>
                  <li>• Lösche Browser-Daten nach jeder Sitzung</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5. Zusätzliche Tools</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                    <a href="https://tails.boum.org/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Tails OS
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                    <a href="https://www.whonix.org/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Whonix
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Kontoverwaltung
            </CardTitle>
            <CardDescription>
              Verwalte dein Benutzerkonto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Konto löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Dein Konto, 
                    alle deine Daten und deine Bitcoin-Adresse werden dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deletingAccount ? 'Wird gelöscht...' : 'Konto löschen'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}