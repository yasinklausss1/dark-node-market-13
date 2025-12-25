import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wallet, Bitcoin, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface WalletBalance {
  balance_eur: number;
  balance_btc: number;
  balance_ltc: number;
  balance_btc_deposited: number;
  balance_ltc_deposited: number;
}

export function WalletBalance() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { btcPrice, ltcPrice } = useCryptoPrices();

  const fetchBalance = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallet_balances')
        .select('balance_eur, balance_btc, balance_ltc, balance_btc_deposited, balance_ltc_deposited')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBalance(data);
      } else {
        // Create initial balance if it doesn't exist
        const { data: newBalance, error: insertError } = await supabase
          .from('wallet_balances')
          .insert({
            user_id: user.id,
            balance_eur: 0,
            balance_btc: 0,
            balance_ltc: 0,
            balance_btc_deposited: 0,
            balance_ltc_deposited: 0
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setBalance(newBalance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: "Fehler",
        description: "Wallet-Guthaben konnte nicht abgerufen werden",
        variant: "destructive",
      });
    }
  }, [toast, user]);


  const refreshPayments = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      // Check for new deposits
      const { error } = await supabase.functions.invoke('check-crypto-deposits');
      if (error) throw error;
      
      // Refresh balance after checking
      await fetchBalance();
      
      toast({
        title: "Aktualisiert",
        description: "Auf neue Zahlungen geprüft und Guthaben aktualisiert",
      });
    } catch (error) {
      console.error('Error refreshing payments:', error);
      toast({
        title: "Fehler",
        description: "Zahlungen konnten nicht aktualisiert werden",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBalance();
    }
  }, [fetchBalance, user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`wallet-balances:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_balances',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBalance();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBalance, user]);

  useEffect(() => {
    setLoading(false);
  }, [balance]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet-Guthaben
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Guthaben wird geladen...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet-Guthaben
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPayments}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Prüfe...' : 'Aktualisieren'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Crypto Balances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bitcoin Balance */}
            <div className="bg-card border p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Bitcoin className="h-5 w-5 text-orange-500" />
                <h4 className="font-medium">Bitcoin (BTC)</h4>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {balance?.balance_btc?.toFixed(8) || '0.00000000'} BTC
                </div>
                {btcPrice && balance?.balance_btc && (
                  <div className="text-lg font-semibold text-primary">
                    ≈ €{(balance.balance_btc * btcPrice).toFixed(2)}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Verfügbar für Einkäufe
                </div>
              </div>
            </div>

            {/* Litecoin Balance */}
            <div className="bg-card border p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium">Litecoin (LTC)</h4>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {balance?.balance_ltc?.toFixed(8) || '0.00000000'} LTC
                </div>
                {ltcPrice && balance?.balance_ltc && (
                  <div className="text-lg font-semibold text-primary">
                    ≈ €{(balance.balance_ltc * ltcPrice).toFixed(2)}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Verfügbar für Einkäufe
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Einzahlungsverlauf</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Gesamt Bitcoin eingezahlt:</span>
              <span className="font-medium">{balance?.balance_btc_deposited?.toFixed(8) || '0.00000000'} BTC</span>
            </div>
            <div className="flex justify-between">
              <span>Gesamt Litecoin eingezahlt:</span>
              <span className="font-medium">{balance?.balance_ltc_deposited?.toFixed(8) || '0.00000000'} LTC</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Hinweis:</strong> Die obigen Beträge zeigen dein verfügbares Krypto-Guthaben und die Gesamteinzahlungen. Klicke auf Aktualisieren um nach neuen eingehenden Zahlungen zu suchen.</p>
        </div>
      </CardContent>
    </Card>
  );
}
