import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Bitcoin, Coins, CheckCircle, Clock, AlertCircle, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface DepositAddress {
  id: string;
  currency: string;
  address: string;
  requested_amount_crypto: number;
  received_amount_crypto: number;
  status: 'pending' | 'received' | 'confirmed' | 'completed' | 'expired' | 'cancelled';
  confirmations: number;
  required_confirmations: number;
  expires_at: string;
  tx_hash: string | null;
}

export function CryptoDepositNew() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCrypto, setSelectedCrypto] = useState<"BTC" | "LTC">("LTC");
  const [cryptoAmount, setCryptoAmount] = useState<string>("0.001");
  const [loading, setLoading] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState<DepositAddress | null>(null);
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

  // Check for existing active deposit
  useEffect(() => {
    if (user) {
      checkExistingDeposit();
    }
  }, [user]);

  // Realtime subscription for deposit status
  useEffect(() => {
    if (!activeDeposit || !user) return;

    const channel = supabase
      .channel('deposit-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deposit_addresses',
          filter: `id=eq.${activeDeposit.id}`
        },
        (payload) => {
          const updated = payload.new as DepositAddress;
          setActiveDeposit(updated);

          if (updated.status === 'completed') {
            toast({
              title: "Einzahlung erfolgreich! 🎉",
              description: `${updated.received_amount_crypto.toFixed(8)} ${updated.currency} wurde gutgeschrieben.`,
            });
          } else if (updated.status === 'received') {
            toast({
              title: "Transaktion erkannt ⏳",
              description: "Warte auf Blockchain-Bestätigung...",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeDeposit?.id, user, toast]);

  // Countdown timer
  useEffect(() => {
    if (!activeDeposit || activeDeposit.status === 'completed') return;
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expires = new Date(activeDeposit.expires_at).getTime();
      const difference = expires - now;
      
      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft("Abgelaufen");
        if (activeDeposit.status === 'pending') {
          setActiveDeposit(prev => prev ? { ...prev, status: 'expired' } : null);
        }
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [activeDeposit]);

  const checkExistingDeposit = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('deposit_addresses')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'received'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setActiveDeposit(data as DepositAddress);
      setSelectedCrypto(data.currency as "BTC" | "LTC");
    } else {
      // Explizit null setzen wenn kein aktiver Deposit gefunden
      setActiveDeposit(null);
    }
  };

  const createDeposit = async () => {
    if (!user) {
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an um einzuzahlen",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(cryptoAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Ungültiger Betrag",
        description: "Bitte gib einen gültigen Betrag ein",
        variant: "destructive",
      });
      return;
    }

    // Minimum amounts
    const minBtc = 0.00001;
    const minLtc = 0.0001;
    const minAmount = selectedCrypto === 'BTC' ? minBtc : minLtc;

    if (amount < minAmount) {
      toast({
        title: "Mindestbetrag nicht erreicht",
        description: `Minimum: ${minAmount} ${selectedCrypto}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('generate-deposit-address', {
        body: { currency: selectedCrypto, amount },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success && response.data?.deposit) {
        setActiveDeposit(response.data.deposit);
        toast({
          title: "Einzahlungsadresse erstellt",
          description: `Sende ${amount.toFixed(8)} ${selectedCrypto} an die Adresse`,
        });
      } else {
        throw new Error(response.data?.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Error creating deposit:', error);
      toast({
        title: "Fehler",
        description: "Adresse konnte nicht erstellt werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelDeposit = async () => {
    if (!activeDeposit) return;
    
    const { error } = await supabase
      .from('deposit_addresses')
      .update({ status: 'cancelled' })
      .eq('id', activeDeposit.id);

    if (error) {
      console.error('Error cancelling deposit:', error);
      toast({
        title: "Fehler",
        description: "Einzahlung konnte nicht abgebrochen werden",
        variant: "destructive",
      });
      return;
    }

    setActiveDeposit(null);
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

  const refreshStatus = async () => {
    if (!activeDeposit) return;
    
    setLoading(true);
    try {
      await supabase.functions.invoke('monitor-deposits');
      await checkExistingDeposit();
      toast({
        title: "Status aktualisiert",
        description: "Blockchain wird überprüft...",
      });
    } catch (e) {
      console.error('Error refreshing:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> Wartet auf Zahlung</Badge>;
      case 'received':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Unbestätigt</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> Bestätigt</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><AlertCircle className="h-3 w-3 mr-1" /> Abgelaufen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const price = selectedCrypto === 'BTC' ? cryptoPrices.btc : cryptoPrices.ltc;
  const eurPreview = (parseFloat(cryptoAmount) || 0) * price;
  const CryptoIcon = selectedCrypto === 'BTC' ? Bitcoin : Coins;
  const iconColor = selectedCrypto === 'BTC' ? 'text-orange-500' : 'text-blue-500';
  const bgColor = selectedCrypto === 'BTC' ? 'bg-orange-500/10' : 'bg-blue-500/10';

  // Active deposit view
  if (activeDeposit && activeDeposit.status !== 'expired' && activeDeposit.status !== 'cancelled') {
    const ActiveIcon = activeDeposit.currency === 'BTC' ? Bitcoin : Coins;
    const activeIconColor = activeDeposit.currency === 'BTC' ? 'text-orange-500' : 'text-blue-500';
    const activeBgColor = activeDeposit.currency === 'BTC' ? 'bg-orange-500/10' : 'bg-blue-500/10';

    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 ${activeBgColor} rounded-lg`}>
                <ActiveIcon className={`h-5 w-5 ${activeIconColor}`} />
              </div>
              <span>Aktive Einzahlung</span>
            </div>
            {activeDeposit.status === 'pending' && (
              <Button variant="ghost" size="sm" onClick={cancelDeposit} className="text-red-600">
                <X className="h-4 w-4 mr-1" /> Abbrechen
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            {getStatusBadge(activeDeposit.status)}
            <span className="text-sm text-muted-foreground">
              {activeDeposit.status !== 'completed' && timeLeft !== "Abgelaufen" && `Gültig: ${timeLeft}`}
            </span>
          </div>

          {/* Amount */}
          <div className={`${activeBgColor} border rounded-xl p-4 text-center`}>
            <Label className="text-xs text-muted-foreground">SENDE GENAU</Label>
            <div className="flex items-center justify-center gap-2 mt-1">
              <code className="text-xl font-bold font-mono">
                {activeDeposit.requested_amount_crypto.toFixed(8)} {activeDeposit.currency}
              </code>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(activeDeposit.requested_amount_crypto.toFixed(8), "Betrag")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {activeDeposit.status === 'received' && activeDeposit.received_amount_crypto > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Empfangen: {activeDeposit.received_amount_crypto.toFixed(8)} {activeDeposit.currency}
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl shadow-sm">
              <QRCodeSVG 
                value={`${activeDeposit.currency.toLowerCase()}:${activeDeposit.address}?amount=${activeDeposit.requested_amount_crypto}`}
                size={160}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">
              {activeDeposit.currency === 'BTC' ? 'Bitcoin' : 'Litecoin'}-Adresse (eindeutig für dich):
            </Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2.5 bg-muted rounded-lg text-xs break-all font-mono">
                {activeDeposit.address}
              </code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(activeDeposit.address, "Adresse")}
                className="h-9 w-9 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Confirmations */}
          {activeDeposit.status === 'received' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm">
                  Bestätigungen: {activeDeposit.confirmations}/{activeDeposit.required_confirmations}
                </span>
              </div>
            </div>
          )}

          {/* TX Hash */}
          {activeDeposit.tx_hash && (
            <div className="text-xs text-muted-foreground">
              <span>TX: </span>
              <code className="break-all">{activeDeposit.tx_hash}</code>
            </div>
          )}

          {/* Refresh Button */}
          {activeDeposit.status !== 'completed' && (
            <Button 
              variant="outline" 
              onClick={refreshStatus} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Status aktualisieren
            </Button>
          )}

          {/* Instructions */}
          {activeDeposit.status === 'pending' && (
            <Alert>
              <AlertDescription className="text-xs">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Kopiere die Adresse und den Betrag</li>
                  <li>Sende {activeDeposit.currency} an diese Adresse</li>
                  <li>Dein Guthaben wird nach {activeDeposit.required_confirmations} Bestätigung(en) gutgeschrieben</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Create deposit view
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CryptoIcon className={`h-5 w-5 ${iconColor}`} />
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
              htmlFor="btc-new"
              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCrypto === "BTC" 
                  ? "border-orange-500 bg-orange-500/5" 
                  : "border-border hover:border-orange-500/50"
              }`}
            >
              <RadioGroupItem value="BTC" id="btc-new" className="sr-only" />
              <div className="p-1.5 bg-orange-500/10 rounded">
                <Bitcoin className="h-4 w-4 text-orange-500" />
              </div>
              <span className="font-medium text-sm">Bitcoin</span>
            </Label>
            
            <Label
              htmlFor="ltc-new"
              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCrypto === "LTC" 
                  ? "border-blue-500 bg-blue-500/5" 
                  : "border-border hover:border-blue-500/50"
              }`}
            >
              <RadioGroupItem value="LTC" id="ltc-new" className="sr-only" />
              <div className="p-1.5 bg-blue-500/10 rounded">
                <Coins className="h-4 w-4 text-blue-500" />
              </div>
              <span className="font-medium text-sm">Litecoin</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="crypto-amount" className="text-sm">
            Betrag in {selectedCrypto}
          </Label>
          <div className="relative">
            <CryptoIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${iconColor}`} />
            <Input
              id="crypto-amount"
              type="number"
              value={cryptoAmount}
              onChange={(e) => setCryptoAmount(e.target.value)}
              placeholder={selectedCrypto === 'BTC' ? "0.001" : "0.1"}
              className="pl-9"
              step="0.00000001"
              min={selectedCrypto === 'BTC' ? "0.00001" : "0.0001"}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: {selectedCrypto === 'BTC' ? '0.00001 BTC' : '0.0001 LTC'}</span>
            <span>≈ €{eurPreview.toFixed(2)}</span>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 flex-wrap">
          {selectedCrypto === 'BTC' 
            ? [0.0001, 0.0005, 0.001, 0.005, 0.01].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCryptoAmount(amount.toString())}
                  className={`text-xs ${cryptoAmount === amount.toString() ? 'border-primary bg-primary/5' : ''}`}
                >
                  {amount} BTC
                </Button>
              ))
            : [0.01, 0.05, 0.1, 0.5, 1].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCryptoAmount(amount.toString())}
                  className={`text-xs ${cryptoAmount === amount.toString() ? 'border-primary bg-primary/5' : ''}`}
                >
                  {amount} LTC
                </Button>
              ))
          }
        </div>

        {/* Create Button */}
        <Button 
          onClick={createDeposit} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Adresse wird generiert...
            </>
          ) : (
            <>Einzahlungsadresse erstellen</>
          )}
        </Button>

        {/* Info */}
        <Alert>
          <AlertDescription className="text-xs text-muted-foreground">
            Für jede Einzahlung wird eine <strong>eindeutige Adresse</strong> generiert, die nur dir gehört. 
            Die Adresse ist 2 Stunden gültig.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
