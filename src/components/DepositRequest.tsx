import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Bitcoin, Coins, Euro, RefreshCw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function DepositRequest() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCrypto, setSelectedCrypto] = useState<"bitcoin" | "litecoin">("bitcoin");
  const [eurAmount, setEurAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatingAddresses, setGeneratingAddresses] = useState(false);
  const [userAddresses, setUserAddresses] = useState<{btc: string, ltc: string} | null>(null);
  const [existingRequest, setExistingRequest] = useState<{
    id: string;
    crypto_amount: number;
    requested_eur: number;
    qr_data: string;
    fingerprint: number;
    expires_at: string;
    address: string;
    currency: string;
  } | null>(null);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [ltcPrice, setLtcPrice] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Check for existing pending request and user addresses
  useEffect(() => {
    if (user) {
      checkExistingRequest();
      getUserAddresses();
    }
  }, [user]);

  // Countdown timer for active deposit request
  useEffect(() => {
    if (!existingRequest) return;
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expires = new Date(existingRequest.expires_at).getTime();
      const difference = expires - now;
      
      if (difference > 0) {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft("Abgelaufen");
        setExistingRequest(null);
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, [existingRequest]);

  const checkExistingRequest = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Check if request is still valid (not expired)
        const now = new Date().getTime();
        const expires = new Date(data.expires_at).getTime();
        
        if (expires > now) {
          const currency = data.currency === 'BTC' ? 'bitcoin' : 'litecoin';
          const qrData = `${currency}:${data.address}?amount=${data.crypto_amount.toFixed(8)}`;
          
          setExistingRequest({
            ...data,
            qr_data: qrData
          });
          setSelectedCrypto(currency);
        }
      }
    } catch (error) {
      console.error('Error checking existing request:', error);
    }
  };

  const getUserAddresses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('currency, address')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      
      if (data && data.length >= 2) {
        const btcAddr = data.find(addr => addr.currency === 'BTC')?.address;
        const ltcAddr = data.find(addr => addr.currency === 'LTC')?.address;
        
        if (btcAddr && ltcAddr && btcAddr !== 'pending' && ltcAddr !== 'pending') {
          setUserAddresses({ btc: btcAddr, ltc: ltcAddr });
        } else {
          // Generate addresses if they are still pending
          await generateUserAddresses();
        }
      } else {
        // Generate addresses if they don't exist
        await generateUserAddresses();
      }
    } catch (error) {
      console.error('Error getting user addresses:', error);
    }
  };

  const generateUserAddresses = async () => {
    if (!user) return;
    
    setGeneratingAddresses(true);
    try {
      // Use generate-user-addresses which uses BlockCypher API for real addresses
      const { data, error } = await supabase.functions.invoke('generate-user-addresses');
      if (error) throw error;
      
      if (data && data.success && data.btcAddress && data.ltcAddress) {
        // Set addresses directly from response
        setUserAddresses({ btc: data.btcAddress, ltc: data.ltcAddress });
        toast({
          title: "Wallet eingerichtet",
          description: "Deine persönlichen Bitcoin- und Litecoin-Adressen wurden erstellt.",
        });
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("Adressen konnten nicht erstellt werden");
      }
    } catch (error) {
      console.error('Error generating addresses:', error);
      toast({
        title: "Fehler", 
        description: "Krypto-Adressen konnten nicht erstellt werden. Bitte versuche es erneut.",
        variant: "destructive",
      });
      
      // Retry after delay
      setTimeout(() => {
        setGeneratingAddresses(false);
      }, 3000);
    } finally {
      setGeneratingAddresses(false);
    }
  };

  const fetchPrices = async () => {
    try {
      // Use a more reliable endpoint with better CORS support
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin&vs_currencies=eur&precision=2');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const btcPriceValue = data.bitcoin?.eur;
      const ltcPriceValue = data.litecoin?.eur;
      
      if (!btcPriceValue || !ltcPriceValue) {
        throw new Error('Ungültige Preisdaten empfangen');
      }
      
      setBtcPrice(btcPriceValue);
      setLtcPrice(ltcPriceValue);
      
      return { btcPrice: btcPriceValue, ltcPrice: ltcPriceValue };
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      // Use fallback prices to prevent blocking
      const fallbackBtc = 90000;
      const fallbackLtc = 100;
      setBtcPrice(fallbackBtc);
      setLtcPrice(fallbackLtc);
      return { btcPrice: fallbackBtc, ltcPrice: fallbackLtc };
    }
  };

  const createDepositRequest = async () => {
    if (!user) {
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an um eine Einzahlungsanfrage zu erstellen",
        variant: "destructive",
      });
      return;
    }

    if (!userAddresses) {
      toast({
        title: "Fehler",
        description: "Benutzeradressen nicht bereit. Bitte warte oder lade die Seite neu.",
        variant: "destructive",
      });
      return;
    }

    if (!eurAmount || parseFloat(eurAmount) <= 0) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen gültigen Betrag ein",
        variant: "destructive",
      });
      return;
    }

    // Check if there's already a pending request
    if (existingRequest) {
      toast({
        title: "Aktive Anfrage vorhanden",
        description: "Du hast bereits eine ausstehende Einzahlungsanfrage. Bitte schließe diese zuerst ab.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const prices = await fetchPrices();
      
      const amountEur = parseFloat(eurAmount);
      const price = selectedCrypto === "bitcoin" ? prices.btcPrice : prices.ltcPrice;
      
      if (!price || price <= 0) {
        throw new Error("Ungültiger Krypto-Preis empfangen");
      }
      
      const amountCrypto = amountEur / price;
      
      // Use user's individual address
      const address = selectedCrypto === "bitcoin" ? userAddresses.btc : userAddresses.ltc;
      
      // Generate fingerprint (1-99 satoshis/litoshis)
      const fingerprint = Math.floor(Math.random() * 99) + 1;
      const finalAmount = amountCrypto + (fingerprint / 1e8);
      
      // Set expiry to 6 hours from now
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      
      // Create deposit request in database
      const { data, error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user.id,
          currency: selectedCrypto === "bitcoin" ? "BTC" : "LTC",
          address: address,
          requested_eur: amountEur,
          rate_locked: price,
          crypto_amount: finalAmount,
          fingerprint: fingerprint,
          status: 'pending',
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;

      // Create BIP21 URI with exact amount
      const currency = selectedCrypto === "bitcoin" ? "bitcoin" : "litecoin";
      const qrData = `${currency}:${address}?amount=${finalAmount.toFixed(8)}`;
      
      const newRequest = {
        id: data.id,
        crypto_amount: finalAmount,
        requested_eur: amountEur,
        qr_data: qrData,
        fingerprint: fingerprint,
        expires_at: expiresAt,
        address: address,
        currency: data.currency
      };

      setExistingRequest(newRequest);

      toast({
        title: "Einzahlungsanfrage erstellt",
        description: `Sende exakt ${finalAmount.toFixed(8)} ${selectedCrypto.toUpperCase()} an deine Adresse innerhalb von 6 Stunden`,
      });
      
    } catch (error) {
      console.error('Error creating deposit request:', error);
      
      let errorMessage = "Einzahlungsanfrage konnte nicht erstellt werden";
      
      if (error instanceof Error) {
        if (error.message.includes('auth')) {
          errorMessage = "Bitte melde dich an um eine Einzahlungsanfrage zu erstellen";
        } else if (error.message.includes('price')) {
          errorMessage = "Krypto-Preise konnten nicht abgerufen werden. Bitte versuche es erneut.";
        } else if (error.message.includes('duplicate key')) {
          errorMessage = "Du hast bereits eine ausstehende Einzahlungsanfrage. Bitte schließe diese zuerst ab.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const closeDepositRequest = async () => {
    if (!existingRequest) return;
    
    try {
      const { data, error } = await supabase.rpc('close_deposit_request', {
        request_id: existingRequest.id
      });

      if (error) throw error;

      if (data) {
        setExistingRequest(null);
        setEurAmount("");
        toast({
          title: "Anfrage geschlossen",
          description: "Deine Einzahlungsanfrage wurde geschlossen.",
        });
      } else {
        throw new Error("Anfrage konnte nicht geschlossen werden");
      }
    } catch (error) {
      console.error('Error closing request:', error);
      toast({
        title: "Fehler",
        description: "Einzahlungsanfrage konnte nicht geschlossen werden",
        variant: "destructive",
      });
    }
  };

  const copyQRData = async () => {
    if (!existingRequest) return;
    
    await navigator.clipboard.writeText(existingRequest.qr_data);
    toast({
      title: "Kopiert",
      description: "Zahlungs-URI in Zwischenablage kopiert",
    });
  };

  const copyAddress = async () => {
    if (!existingRequest) return;
    await navigator.clipboard.writeText(existingRequest.address);
    toast({
      title: "Kopiert",
      description: "Adresse in Zwischenablage kopiert",
    });
  };

  const resetRequest = () => {
    setExistingRequest(null);
    setEurAmount("");
  };

  // Show existing request if it exists
  if (existingRequest) {
    const cryptoName = existingRequest.currency === 'BTC' ? 'bitcoin' : 'litecoin';
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              {cryptoName === "bitcoin" ? (
                <div className="p-1.5 bg-orange-500/10 rounded-lg">
                  <Bitcoin className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
              ) : (
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
              )}
              <span className="text-base sm:text-lg">Aktive Einzahlung</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={closeDepositRequest}
              className="text-red-600 hover:text-red-700 h-9 self-stretch sm:self-auto"
            >
              <X className="h-4 w-4 mr-1.5" />
              Schließen
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
          {/* Amount Info */}
          <div className="bg-muted/50 p-3 sm:p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-muted-foreground">Betrag (EUR):</span>
              <span className="font-bold">€{existingRequest.requested_eur.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-muted-foreground">Betrag ({existingRequest.currency}):</span>
              <span className="font-bold font-mono text-xs sm:text-sm">{existingRequest.crypto_amount.toFixed(8)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Verbleibend:</span>
              <span className={`font-medium ${timeLeft === "Abgelaufen" ? "text-red-500" : "text-primary"}`}>
                {timeLeft}
              </span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-2 sm:p-3 rounded-xl">
              <QRCodeSVG 
                value={existingRequest.qr_data}
                size={160}
                className="w-36 h-36 sm:w-48 sm:h-48"
              />
            </div>
          </div>

          {/* Copy Buttons */}
          <div className="space-y-2 sm:space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium text-muted-foreground">
                {cryptoName === "bitcoin" ? "Bitcoin" : "Litecoin"}-Adresse:
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 sm:p-2.5 bg-muted rounded-lg text-[10px] sm:text-xs break-all font-mono">
                  {existingRequest.address}
                </code>
                <Button variant="outline" size="sm" onClick={copyAddress} className="h-9 w-9 p-0 flex-shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Zahlungs-URI:</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 sm:p-2.5 bg-muted rounded-lg text-[10px] sm:text-xs break-all font-mono">
                  {existingRequest.qr_data}
                </code>
                <Button variant="outline" size="sm" onClick={copyQRData} className="h-9 w-9 p-0 flex-shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-primary/5 border border-primary/20 p-3 sm:p-4 rounded-xl">
            <h4 className="font-medium text-xs sm:text-sm mb-2">Wichtig:</h4>
            <ul className="space-y-1 text-[10px] sm:text-xs text-muted-foreground">
              <li>• Sende EXAKT <span className="font-mono font-medium text-foreground">{existingRequest.crypto_amount.toFixed(8)} {existingRequest.currency}</span></li>
              <li>• Zahlung nach 1 Bestätigung gutgeschrieben</li>
              <li>• Läuft ab: {new Date(existingRequest.expires_at).toLocaleString('de-DE')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while generating addresses
  if (generatingAddresses || !userAddresses) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Wallet wird eingerichtet
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 sm:py-8 px-3 sm:px-6">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-xs sm:text-sm">
              {generatingAddresses ? "Adressen werden erstellt..." : "Adressen werden geladen..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Einzahlung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
        {/* Amount Input */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="amount" className="text-xs sm:text-sm">Betrag (EUR)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="1"
            placeholder="Betrag eingeben"
            value={eurAmount}
            onChange={(e) => setEurAmount(e.target.value)}
            disabled={!user}
            className="h-11 sm:h-10 text-base sm:text-sm"
          />
        </div>

        {/* Crypto Selection - Mobile Optimized */}
        <div className="space-y-2 sm:space-y-3">
          <Label className="text-xs sm:text-sm font-medium">Kryptowährung:</Label>
          <RadioGroup 
            value={selectedCrypto} 
            onValueChange={(value) => setSelectedCrypto(value as "bitcoin" | "litecoin")}
            className="grid grid-cols-2 gap-2 sm:gap-3"
          >
            <div className={`relative flex items-center justify-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedCrypto === 'bitcoin' 
                ? 'border-orange-500 bg-orange-500/5' 
                : 'border-muted hover:border-muted-foreground/50'
            }`}>
              <RadioGroupItem value="bitcoin" id="bitcoin" className="sr-only" />
              <Label htmlFor="bitcoin" className="flex flex-col items-center gap-1.5 cursor-pointer">
                <Bitcoin className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
                <span className="text-xs sm:text-sm font-medium">Bitcoin</span>
              </Label>
            </div>
            <div className={`relative flex items-center justify-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedCrypto === 'litecoin' 
                ? 'border-blue-500 bg-blue-500/5' 
                : 'border-muted hover:border-muted-foreground/50'
            }`}>
              <RadioGroupItem value="litecoin" id="litecoin" className="sr-only" />
              <Label htmlFor="litecoin" className="flex flex-col items-center gap-1.5 cursor-pointer">
                <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                <span className="text-xs sm:text-sm font-medium">Litecoin</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* User Addresses - Collapsed on Mobile */}
        {userAddresses && (
          <div className="bg-muted/50 p-3 sm:p-4 rounded-xl">
            <h4 className="font-medium text-xs sm:text-sm mb-2">Deine Adressen:</h4>
            <div className="space-y-1.5 text-[10px] sm:text-xs">
              <div className="flex items-start gap-1">
                <span className="font-medium text-orange-500">BTC:</span>
                <span className="font-mono break-all text-muted-foreground">{userAddresses.btc}</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="font-medium text-blue-500">LTC:</span>
                <span className="font-mono break-all text-muted-foreground">{userAddresses.ltc}</span>
              </div>
            </div>
          </div>
        )}

        {/* Create Button */}
        <Button 
          onClick={createDepositRequest} 
          disabled={loading || !user || !eurAmount || parseFloat(eurAmount) <= 0 || !!existingRequest}
          className="w-full h-11 sm:h-10 text-sm sm:text-base"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Wird erstellt...
            </>
          ) : existingRequest ? (
            'Anfrage aktiv'
          ) : (
            'Einzahlung starten'
          )}
        </Button>

        {/* How it works - Collapsed */}
        <div className="text-[10px] sm:text-xs text-muted-foreground space-y-1">
          <p className="font-medium">So funktioniert es:</p>
          <ul className="space-y-0.5 pl-2">
            <li>• Betrag eingeben & Krypto wählen</li>
            <li>• An deine persönliche Adresse senden</li>
            <li>• Anfragen laufen nach 6 Stunden ab</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
