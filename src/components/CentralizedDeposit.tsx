import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Bitcoin, Coins, Euro, CheckCircle, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Zentrale Platform-Adressen
const CENTRAL_ADDRESSES = {
  BTC: '16rmws2YNweEAsbVAV2KauwhFjP2myDfsf',
  LTC: 'Lejgj3ZCYryMz4b7ConCzv5wpEHqTZriFy'
};

interface DepositRequest {
  id: string;
  currency: string;
  requested_eur: number;
  crypto_amount: number;
  fingerprint: number;
  status: string;
  expires_at: string;
  address: string;
  rate_locked: number;
}

export function CentralizedDeposit() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCrypto, setSelectedCrypto] = useState<"BTC" | "LTC">("BTC");
  const [eurAmount, setEurAmount] = useState<string>("10");
  const [loading, setLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState<DepositRequest | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [cryptoPrices, setCryptoPrices] = useState<{ btc: number; ltc: number }>({ btc: 90000, ltc: 100 });

  // Fetch crypto prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin&vs_currencies=eur'
        );
        if (response.ok) {
          const data = await response.json();
          setCryptoPrices({
            btc: data.bitcoin?.eur || 90000,
            ltc: data.litecoin?.eur || 100
          });
        }
      } catch (e) {
        console.log('Using fallback prices');
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check for existing active request
  useEffect(() => {
    if (user) {
      checkExistingRequest();
    }
  }, [user]);

  // Subscribe to request status changes
  useEffect(() => {
    if (!activeRequest || !user) return;

    const channel = supabase
      .channel('deposit-request-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deposit_requests',
          filter: `id=eq.${activeRequest.id}`
        },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus === 'completed' || newStatus === 'confirmed') {
            setActiveRequest(null);
            setEurAmount("10");
            toast({
              title: "Einzahlung erfolgreich! 🎉",
              description: "Dein Guthaben wurde aktualisiert.",
            });
          } else if (newStatus === 'received') {
            toast({
              title: "Zahlung erkannt! ⏳",
              description: "Warten auf Blockchain-Bestätigung...",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRequest, user, toast]);

  // Countdown timer
  useEffect(() => {
    if (!activeRequest) return;
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expires = new Date(activeRequest.expires_at).getTime();
      const difference = expires - now;
      
      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft("Abgelaufen");
        setActiveRequest(null);
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [activeRequest]);

  const checkExistingRequest = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setActiveRequest(data);
      setSelectedCrypto(data.currency as "BTC" | "LTC");
    }
  };

  // Generate unique fingerprint (last 4 digits of satoshi/litoshi amount)
  const generateFingerprint = (): number => {
    return Math.floor(1000 + Math.random() * 8999); // 1000-9999
  };

  const createDepositRequest = async () => {
    if (!user) {
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an um einzuzahlen",
        variant: "destructive",
      });
      return;
    }

    const eurValue = parseFloat(eurAmount);
    if (!eurValue || eurValue < 5) {
      toast({
        title: "Mindestbetrag",
        description: "Mindesteinzahlung ist 5€",
        variant: "destructive",
      });
      return;
    }

    if (activeRequest) {
      toast({
        title: "Aktive Einzahlung",
        description: "Du hast bereits eine aktive Einzahlungsanfrage",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const price = selectedCrypto === "BTC" ? cryptoPrices.btc : cryptoPrices.ltc;
      const baseCryptoAmount = eurValue / price;
      
      // Generate unique fingerprint (4 digits) and embed in middle of amount
      // This way network fees (which affect last digits) won't change the fingerprint
      const fingerprint = generateFingerprint();
      const baseSatoshi = Math.floor(baseCryptoAmount * 100000000);
      
      // Format: 0.0XFFFF00 where FFFF is fingerprint, X is base amount digit
      // Keep first 2 significant digits, insert fingerprint, add random end
      const leadingDigit = Math.floor(baseSatoshi / 1000000) % 10; // Get a stable leading digit
      const finalSatoshi = leadingDigit * 1000000 + fingerprint * 100 + Math.floor(Math.random() * 100);
      const finalCryptoAmount = finalSatoshi / 100000000;

      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours

      const { data, error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user.id,
          currency: selectedCrypto,
          requested_eur: eurValue,
          crypto_amount: finalCryptoAmount,
          fingerprint: fingerprint,
          rate_locked: price,
          address: CENTRAL_ADDRESSES[selectedCrypto],
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;

      setActiveRequest(data);
      
      toast({
        title: "Einzahlung erstellt",
        description: `Sende exakt ${finalCryptoAmount.toFixed(8)} ${selectedCrypto}`,
      });
      
    } catch (error) {
      console.error('Error creating deposit request:', error);
      toast({
        title: "Fehler",
        description: "Einzahlungsanfrage konnte nicht erstellt werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!activeRequest) return;
    
    await supabase
      .from('deposit_requests')
      .update({ status: 'expired' })
      .eq('id', activeRequest.id);

    setActiveRequest(null);
    setEurAmount("10");
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

  // Calculate preview amount
  const previewEur = parseFloat(eurAmount) || 0;
  const previewPrice = selectedCrypto === "BTC" ? cryptoPrices.btc : cryptoPrices.ltc;
  const previewCrypto = previewEur > 0 ? (previewEur / previewPrice).toFixed(8) : "0.00000000";

  // Active deposit view
  if (activeRequest) {
    const cryptoSymbol = activeRequest.currency;
    const ActiveIcon = cryptoSymbol === "BTC" ? Bitcoin : Coins;
    const activeIconColor = cryptoSymbol === "BTC" ? "text-orange-500" : "text-blue-500";
    const activeBgColor = cryptoSymbol === "BTC" ? "bg-orange-500/10" : "bg-blue-500/10";
    const activeCryptoName = cryptoSymbol === "BTC" ? "Bitcoin" : "Litecoin";

    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 ${activeBgColor} rounded-lg`}>
                <ActiveIcon className={`h-5 w-5 ${activeIconColor}`} />
              </div>
              <span>Aktive Einzahlung</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cancelRequest}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Abbrechen
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Critical: Exact Amount */}
          <Alert className="border-amber-500 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              <strong>WICHTIG:</strong> Sende <strong>EXAKT</strong> den angegebenen Betrag! Der eindeutige Betrag wird dir automatisch zugeordnet.
            </AlertDescription>
          </Alert>

          {/* Exact Amount - Most Important */}
          <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 text-center">
            <Label className="text-xs text-muted-foreground">SENDE EXAKT DIESEN BETRAG</Label>
            <div className="flex items-center justify-center gap-2 mt-1">
              <code className="text-xl sm:text-2xl font-bold font-mono">
                {activeRequest.crypto_amount.toFixed(8)} {cryptoSymbol}
              </code>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(activeRequest.crypto_amount.toFixed(8), "Betrag")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ €{activeRequest.requested_eur.toFixed(2)}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG 
                value={`${cryptoSymbol.toLowerCase()}:${activeRequest.address}?amount=${activeRequest.crypto_amount}`}
                size={160}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">
              {activeCryptoName}-Adresse:
            </Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2.5 bg-muted rounded-lg text-xs break-all font-mono">
                {activeRequest.address}
              </code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(activeRequest.address, "Adresse")}
                className="h-9 w-9 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Betrag:</span>
              <span className="font-medium">€{activeRequest.requested_eur.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kurs (gesperrt):</span>
              <span className="font-medium">€{activeRequest.rate_locked?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gültig noch:</span>
              <span className={`font-medium ${timeLeft === "Abgelaufen" ? "text-red-500" : "text-primary"}`}>
                {timeLeft}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>1. Kopiere die Adresse und den <strong>exakten Betrag</strong></p>
            <p>2. Sende {activeCryptoName} an die Adresse</p>
            <p>3. Dein Guthaben wird nach 1 Bestätigung gutgeschrieben</p>
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

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm">
            Betrag in EUR
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
              min="5"
              step="1"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: 5€</span>
            <span>≈ {previewCrypto} {selectedCrypto}</span>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 flex-wrap">
          {[10, 25, 50, 100, 250].map((amount) => (
            <Button
              key={amount}
              variant={eurAmount === String(amount) ? "default" : "outline"}
              size="sm"
              onClick={() => setEurAmount(String(amount))}
              className="text-xs"
            >
              €{amount}
            </Button>
          ))}
        </div>

        {/* Advantages */}
        <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Automatische Zuordnung durch eindeutigen Betrag</span>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Kurs wird für 2 Stunden gesperrt</span>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Funktioniert mit allen Wallets (Exodus, Ledger, etc.)</span>
          </div>
        </div>

        {/* Create Button */}
        <Button 
          onClick={createDepositRequest} 
          disabled={loading || !eurAmount || parseFloat(eurAmount) < 5}
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
