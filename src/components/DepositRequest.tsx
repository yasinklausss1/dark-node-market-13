import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Bitcoin, Coins, Euro, X, Wallet, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState(100);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const { btcPrice, ltcPrice } = useCryptoPrices();
  const ethPrice = 3500;

  useEffect(() => {
    if (user) {
      getUserAddresses();
      checkActiveRequest();
    }
  }, [user]);

  // Timer for active deposit request
  useEffect(() => {
    if (!activeRequest) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(activeRequest.expires_at).getTime();
      const totalDuration = 6 * 60 * 60 * 1000; // 6 hours
      const remaining = expires - now;

      if (remaining <= 0) {
        setActiveRequest(null);
        setTimeRemaining("Expired");
        setProgressPercent(0);
        toast({
          title: "Deposit Request Expired",
          description: "Your deposit request has expired. Please create a new one.",
          variant: "destructive"
        });
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      setProgressPercent(Math.round((remaining / totalDuration) * 100));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRequest]);

  const getUserAddresses = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
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
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const now = new Date().getTime();
        const expires = new Date(data.expires_at).getTime();
        
        if (expires > now) {
          setActiveRequest(data);
          setSelectedCurrency(data.currency as 'BTC' | 'LTC' | 'ETH');
        } else {
          // Auto-close expired request
          await closeDepositRequest(data.id);
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

    // Check if there's already an active request
    if (activeRequest) {
      toast({
        title: "Active Request Exists",
        description: "Please complete or cancel your current deposit request first.",
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
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
      
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
      toast({
        title: "Deposit Request Created",
        description: `Send exactly ${cryptoAmount.toFixed(8)} ${selectedCurrency} to the address below.`,
      });
    } catch (error: any) {
      console.error('Error creating deposit request:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const closeDepositRequest = async (requestId?: string) => {
    const id = requestId || activeRequest?.id;
    if (!id) return;

    try {
      const { error } = await supabase
        .from('deposit_requests')
        .update({ status: 'closed' })
        .eq('id', id);

      if (error) throw error;

      setActiveRequest(null);
      setEurAmount("");
      toast({
        title: "Request Cancelled",
        description: "Your deposit request has been cancelled.",
      });
    } catch (error) {
      console.error('Error closing request:', error);
    }
  };

  const copyAddress = async () => {
    if (!activeRequest) return;
    await navigator.clipboard.writeText(activeRequest.address);
    toast({
      title: "Copied",
      description: "Deposit address copied to clipboard",
    });
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'BTC': return <Bitcoin className="h-5 w-5 text-orange-500" />;
      case 'LTC': return <Coins className="h-5 w-5 text-gray-500" />;
      case 'ETH': return <Wallet className="h-5 w-5 text-blue-500" />;
      default: return <Euro className="h-5 w-5" />;
    }
  };

  // Active Request View
  if (activeRequest) {
    return (
      <>
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getCurrencyIcon(activeRequest.currency)}
                Active Deposit Request
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCloseDialog(true)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Time Remaining
              </div>
              <span className="text-lg font-bold font-mono">{timeRemaining}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {progressPercent < 20 && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your deposit request will expire soon!
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Amount Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Amount to Send</p>
              <p className="text-lg font-bold font-mono">
                {activeRequest.crypto_amount.toFixed(8)} {activeRequest.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">EUR Value</p>
              <p className="text-lg font-bold">€{activeRequest.requested_eur.toFixed(2)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Exchange Rate (Locked)</p>
              <p className="text-sm font-medium">1 {activeRequest.currency} = €{activeRequest.rate_locked.toFixed(2)}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCodeSVG 
              value={activeRequest.address} 
              size={220}
              includeMargin={true}
            />
          </div>

          {/* Deposit Address */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Deposit Address</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg text-sm break-all font-mono">
                {activeRequest.address}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAddress}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">Important Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Send exactly <strong>{activeRequest.crypto_amount.toFixed(8)} {activeRequest.currency}</strong></li>
                <li>Only send {activeRequest.currency} to this address</li>
                <li>Your balance will be credited after network confirmation</li>
                <li>This request expires in {timeRemaining}</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to close this deposit request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your active deposit request. Any funds sent to this address after cancellation may not be credited to your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                closeDepositRequest();
                setShowCloseDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Close Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
    );
  }

  // Create New Request View
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Create Deposit Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Cryptocurrency</Label>
            <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as any)}>
              <SelectTrigger id="currency">
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
                    <Coins className="h-4 w-4 text-gray-500" />
                    Litecoin (LTC)
                  </div>
                </SelectItem>
                <SelectItem value="ETH">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    Ethereum (ETH)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (EUR)</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="Minimum €10"
                value={eurAmount}
                onChange={(e) => setEurAmount(e.target.value)}
                className="pl-9"
                min="10"
                step="0.01"
              />
            </div>
            {eurAmount && parseFloat(eurAmount) >= 10 && (
              <p className="text-sm text-muted-foreground">
                ≈ {(parseFloat(eurAmount) / (selectedCurrency === 'BTC' ? btcPrice : selectedCurrency === 'LTC' ? ltcPrice : ethPrice)).toFixed(8)} {selectedCurrency}
              </p>
            )}
          </div>
        </div>

        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Your deposit request will be valid for <strong>6 hours</strong>. 
            Only one active request is allowed at a time.
          </AlertDescription>
        </Alert>

        <Button
          onClick={createDepositRequest}
          disabled={loading || !eurAmount || parseFloat(eurAmount) < 10}
          className="w-full"
          size="lg"
        >
          {loading ? "Creating..." : "Create Deposit Request"}
        </Button>
      </CardContent>
    </Card>
  );
}