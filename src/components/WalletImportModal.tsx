import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bitcoin, Coins, AlertTriangle, Eye, EyeOff, Upload, HelpCircle, ChevronDown } from "lucide-react";

interface WalletImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const WalletImportModal = ({ open, onOpenChange, onSuccess }: WalletImportModalProps) => {
  const [currency, setCurrency] = useState<'BTC' | 'LTC'>('BTC');
  const [privateKey, setPrivateKey] = useState('');
  const [address, setAddress] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!privateKey.trim() || !address.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib Private Key und Adresse ein",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Fehler",
          description: "Nicht angemeldet",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-wallet', {
        body: { currency, privateKey, address }
      });

      if (error) {
        throw new Error(error.message || 'Import fehlgeschlagen');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Erfolg",
        description: `${currency} Wallet erfolgreich importiert`
      });

      // Reset form
      setPrivateKey('');
      setAddress('');
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Fehler",
        description: error.message || "Import fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPrivateKey('');
    setAddress('');
    setShowPrivateKey(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Wallet importieren
          </DialogTitle>
          <DialogDescription>
            Importiere eine existierende Wallet mit Private Key
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-green-500/50 bg-green-500/10">
          <AlertDescription className="text-green-200 text-xs">
            Dein Private Key wird sicher verschlüsselt gespeichert und ist nur für dich zugänglich.
          </AlertDescription>
        </Alert>

        <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Wo finde ich meinen Private Key?
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs space-y-3">
              <div>
                <p className="font-semibold text-foreground">Exodus:</p>
                <p className="text-muted-foreground">Wallet öffnen → Münze auswählen → ⋮ Menü → "View Private Keys" → Passwort eingeben</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Electrum:</p>
                <p className="text-muted-foreground">Wallet → Adressen → Rechtsklick auf Adresse → "Private Key"</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Trust Wallet:</p>
                <p className="text-muted-foreground">Einstellungen → Wallets → (i) Button → "Private Key anzeigen"</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Atomic Wallet:</p>
                <p className="text-muted-foreground">Einstellungen → Private Keys → Münze auswählen → Passwort</p>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">WIF-Format:</strong> BTC beginnt mit 5/K/L, LTC beginnt mit 6/T (51-52 Zeichen)
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Währung</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as 'BTC' | 'LTC')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC">
                  <div className="flex items-center gap-2">
                    <Bitcoin className="h-4 w-4 text-orange-500" />
                    Bitcoin (BTC)
                  </div>
                </SelectItem>
                <SelectItem value="LTC">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-blue-500" />
                    Litecoin (LTC)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Wallet-Adresse</Label>
            <Input
              placeholder={currency === 'BTC' ? '1A1zP1eP5QGefi2...' : 'LQTpS3VaYTjCr3...'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {currency === 'BTC' 
                ? 'Beginnt mit 1, 3 oder bc1' 
                : 'Beginnt mit L, M oder ltc1'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Private Key (WIF-Format)</Label>
            <div className="relative">
              <Input
                type={showPrivateKey ? "text" : "password"}
                placeholder={currency === 'BTC' ? '5HueCGU8rMjxEXx...' : '6uGkQ2KiJvBvbr...'}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {currency === 'BTC' 
                ? 'Beginnt mit 5, K oder L' 
                : 'Beginnt mit 6 oder T'}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleImport} disabled={loading} className="flex-1">
              {loading ? 'Importiere...' : 'Importieren'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
