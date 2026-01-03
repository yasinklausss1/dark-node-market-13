import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Bitcoin, Coins, Euro, AlertCircle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Zentrale Platform-Adressen
const CENTRAL_ADDRESSES = {
  BTC: '16rmws2YNweEAsbVAV2KauwhFjP2myDfsf',
  LTC: 'Lejgj3ZCYryMz4b7ConCzv5wpEHqTZriFy'
};

interface DepositMemo {
  id: string;
  memo_code: string;
  currency: string;
  requested_eur: number | null;
  status: string;
  expires_at: string;
}

export function CentralizedDeposit() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCrypto, setSelectedCrypto] = useState<"BTC" | "LTC">("BTC");
  const [eurAmount, setEurAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [activeMemo, setActiveMemo] = useState<DepositMemo | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Check for existing active memo
  useEffect(() => {
    if (user) {
      checkExistingMemo();
    }
  }, [user]);

  // Subscribe to memo status changes
  useEffect(() => {
    if (!activeMemo || !user) return;

    const channel = supabase
      .channel('deposit-memo-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deposit_memos',
          filter: `id=eq.${activeMemo.id}`
        },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus === 'completed') {
            setActiveMemo(null);
            setEurAmount("");
            toast({
              title: "Einzahlung erfolgreich! 🎉",
              description: "Dein Guthaben wurde aktualisiert.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMemo, user, toast]);

  // Countdown timer
  useEffect(() => {
    if (!activeMemo) return;
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expires = new Date(activeMemo.expires_at).getTime();
      const difference = expires - now;
      
      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft("Abgelaufen");
        setActiveMemo(null);
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [activeMemo]);

  const checkExistingMemo = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('deposit_memos')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setActiveMemo(data);
      setSelectedCrypto(data.currency as "BTC" | "LTC");
    }
  };

  const createDepositMemo = async () => {
    if (!user) {
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an um einzuzahlen",
        variant: "destructive",
      });
      return;
    }

    if (activeMemo) {
      toast({
        title: "Aktive Einzahlung",
        description: "Du hast bereits eine aktive Einzahlungsanfrage",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Generate unique memo code via database function
      const { data: memoCode, error: codeError } = await supabase.rpc('generate_memo_code');
      
      if (codeError) throw codeError;

      const requestedEur = eurAmount ? parseFloat(eurAmount) : null;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('deposit_memos')
        .insert({
          user_id: user.id,
          memo_code: memoCode,
          currency: selectedCrypto,
          requested_eur: requestedEur,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;

      setActiveMemo(data);
      
      toast({
        title: "Einzahlungs-Code erstellt",
        description: `Dein Memo-Code: ${memoCode}`,
      });
      
    } catch (error) {
      console.error('Error creating deposit memo:', error);
      toast({
        title: "Fehler",
        description: "Einzahlungsanfrage konnte nicht erstellt werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelMemo = async () => {
    if (!activeMemo) return;
    
    await supabase
      .from('deposit_memos')
      .update({ status: 'expired' })
      .eq('id', activeMemo.id);

    setActiveMemo(null);
    setEurAmount("");
    toast({
      title: "Abgebrochen",
      description: "Einzahlungsanfrage wurde abgebrochen",
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Kopiert",
      description: `${label} in Zwischenablage kopiert`,
    });
  };

  const address = CENTRAL_ADDRESSES[selectedCrypto];
  const cryptoName = selectedCrypto === "BTC" ? "Bitcoin" : "Litecoin";
  const CryptoIcon = selectedCrypto === "BTC" ? Bitcoin : Coins;
  const iconColor = selectedCrypto === "BTC" ? "text-orange-500" : "text-blue-500";
  const bgColor = selectedCrypto === "BTC" ? "bg-orange-500/10" : "bg-blue-500/10";

  // Active deposit view
  if (activeMemo) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 ${bgColor} rounded-lg`}>
                <CryptoIcon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <span>Aktive Einzahlung</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cancelMemo}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Abbrechen
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Important Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Wichtig:</strong> Füge den Memo-Code als Nachricht/Notiz bei deiner Transaktion hinzu!
            </AlertDescription>
          </Alert>

          {/* Memo Code - Most Important */}
          <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 text-center">
            <Label className="text-xs text-muted-foreground">DEIN MEMO-CODE</Label>
            <div className="flex items-center justify-center gap-2 mt-1">
              <code className="text-2xl sm:text-3xl font-bold font-mono tracking-widest">
                {activeMemo.memo_code}
              </code>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(activeMemo.memo_code, "Memo-Code")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG 
                value={address}
                size={160}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">
              {cryptoName}-Adresse:
            </Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2.5 bg-muted rounded-lg text-xs break-all font-mono">
                {address}
              </code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(address, "Adresse")}
                className="h-9 w-9 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
            {activeMemo.requested_eur && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gewünschter Betrag:</span>
                <span className="font-medium">€{activeMemo.requested_eur.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gültig noch:</span>
              <span className={`font-medium ${timeLeft === "Abgelaufen" ? "text-red-500" : "text-primary"}`}>
                {timeLeft}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>1. Kopiere die Adresse und den Memo-Code</p>
            <p>2. Sende {cryptoName} an die Adresse</p>
            <p>3. <strong>Wichtig:</strong> Füge den Memo-Code bei der Transaktion hinzu</p>
            <p>4. Dein Guthaben wird nach Bestätigung gutgeschrieben</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create deposit view
  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Euro className="h-5 w-5 text-primary" />
          Krypto einzahlen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Crypto Selection */}
        <div className="space-y-2">
          <Label className="text-sm">Währung auswählen</Label>
          <RadioGroup 
            value={selectedCrypto} 
            onValueChange={(v) => setSelectedCrypto(v as "BTC" | "LTC")}
            className="grid grid-cols-2 gap-3"
          >
            <Label
              htmlFor="btc"
              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCrypto === "BTC" 
                  ? "border-orange-500 bg-orange-500/5" 
                  : "border-border hover:border-orange-500/50"
              }`}
            >
              <RadioGroupItem value="BTC" id="btc" className="sr-only" />
              <div className="p-1.5 bg-orange-500/10 rounded">
                <Bitcoin className="h-4 w-4 text-orange-500" />
              </div>
              <span className="font-medium text-sm">Bitcoin</span>
            </Label>
            
            <Label
              htmlFor="ltc"
              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCrypto === "LTC" 
                  ? "border-blue-500 bg-blue-500/5" 
                  : "border-border hover:border-blue-500/50"
              }`}
            >
              <RadioGroupItem value="LTC" id="ltc" className="sr-only" />
              <div className="p-1.5 bg-blue-500/10 rounded">
                <Coins className="h-4 w-4 text-blue-500" />
              </div>
              <span className="font-medium text-sm">Litecoin</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Amount (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm">
            Betrag in EUR (optional)
          </Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              value={eurAmount}
              onChange={(e) => setEurAmount(e.target.value)}
              placeholder="z.B. 50"
              className="pl-9"
              min="0"
              step="1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Optional: Hilft uns deine Einzahlung zuzuordnen
          </p>
        </div>

        {/* Advantages */}
        <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Keine Mindesteinzahlung</span>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Automatische Gutschrift</span>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>24 Stunden gültig</span>
          </div>
        </div>

        {/* Create Button */}
        <Button 
          onClick={createDepositMemo} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Erstelle...
            </>
          ) : (
            <>
              <CryptoIcon className="h-4 w-4 mr-2" />
              Einzahlung starten
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
