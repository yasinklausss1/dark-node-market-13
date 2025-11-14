import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Bitcoin, Coins, Euro, X, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface DepositAddress {
  currency: string;
  address: string;
}

export function DepositRequest() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<'BTC' | 'LTC' | 'ETH'>('BTC');
  const [eurAmount, setEurAmount] = useState("");
  const [addresses, setAddresses] = useState<DepositAddress[]>([]);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { btcPrice, ltcPrice } = useCryptoPrices();
  const ethPrice = 3500; // Placeholder

  useEffect(() => {
    if (user) {
      getUserAddresses();
      checkActiveRequest();
    }
  }, [user]);

  const getUserAddresses = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      console.log('User addresses:', data);
      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({
        title: "Error",
        description: "Failed to load crypto addresses",
        variant: "destructive"
      });
    }
  };

  const checkActiveRequest = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const now = new Date().getTime();
        const expires = new Date(data.expires_at).getTime();
        
        if (expires > now) {
          setActiveRequest(data);
          setSelectedCurrency(data.currency as 'BTC' | 'LTC' | 'ETH');
        }
      }
    } catch (error) {
      console.error('Error checking active request:', error);
    }
  };

  const createDepositRequest = async () => {
    if (!user?.id || !eurAmount || parseFloat(eurAmount) < 10) {
      toast({
        title: "Invalid amount",
        description: "Minimum deposit is €10",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(eurAmount);
      const address = addresses.find(a => a.currency === selectedCurrency);
      
      if (!address) {
        throw new Error('Address not found');
      }

      const price = selectedCurrency === 'BTC' ? btcPrice : 
                    selectedCurrency === 'LTC' ? ltcPrice : ethPrice;
      const cryptoAmount = amount / price;
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      
      const { data, error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user.id,
          currency: selectedCurrency,
          requested_eur: amount,
          crypto_amount: cryptoAmount,
          rate_locked: price,
          address: address.address,
          fingerprint: Math.floor(Math.random() * 1000000),
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setActiveRequest(data);
      setEurAmount("");
      
      toast({
        title: "Deposit request created",
        description: `Send ${cryptoAmount.toFixed(8)} ${selectedCurrency} to the address below`
      });
    } catch (error: any) {
      console.error('Error creating deposit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create deposit request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!activeRequest) return;

    try {
      const { error } = await supabase
        .from('deposit_requests')
        .update({ status: 'closed' })
        .eq('id', activeRequest.id);

      if (error) throw error;

      setActiveRequest(null);
      toast({
        title: "Request cancelled",
        description: "Deposit request has been cancelled"
      });
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard"
    });
  };

  const selectedAddress = addresses.find(a => a.currency === selectedCurrency);

  if (activeRequest) {
    const qrData = `${selectedCurrency.toLowerCase()}:${activeRequest.address}?amount=${activeRequest.crypto_amount.toFixed(8)}`;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Active Deposit Request
            </span>
            <Button variant="ghost" size="icon" onClick={cancelRequest}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Send exactly</p>
            <p className="text-2xl font-bold">{activeRequest.crypto_amount.toFixed(8)} {activeRequest.currency}</p>
            <p className="text-sm text-muted-foreground mt-1">≈ €{activeRequest.requested_eur.toFixed(2)}</p>
          </div>

          <div className="flex justify-center">
            <QRCodeSVG value={qrData} size={200} />
          </div>

          <div className="space-y-2">
            <Label>Deposit Address</Label>
            <div className="flex gap-2">
              <Input value={activeRequest.address} readOnly className="font-mono text-sm" />
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(activeRequest.address)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Send only {activeRequest.currency} to this address. Sending other cryptocurrencies will result in loss of funds.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Create Deposit Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select Cryptocurrency</Label>
          <Select value={selectedCurrency} onValueChange={(value: 'BTC' | 'LTC' | 'ETH') => setSelectedCurrency(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
              <SelectItem value="LTC">Litecoin (LTC)</SelectItem>
              <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedAddress && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Your {selectedCurrency} Address</p>
            <p className="text-sm font-mono break-all">{selectedAddress.address}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="eurAmount">Amount in EUR</Label>
          <Input
            id="eurAmount"
            type="number"
            placeholder="Minimum €10"
            value={eurAmount}
            onChange={(e) => setEurAmount(e.target.value)}
            min="10"
            step="1"
          />
          {eurAmount && parseFloat(eurAmount) >= 10 && (
            <p className="text-sm text-muted-foreground">
              ≈ {(parseFloat(eurAmount) / (selectedCurrency === 'BTC' ? btcPrice : selectedCurrency === 'LTC' ? ltcPrice : ethPrice)).toFixed(8)} {selectedCurrency}
            </p>
          )}
        </div>

        <Button onClick={createDepositRequest} disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create Deposit Request"}
        </Button>
      </CardContent>
    </Card>
  );
}
