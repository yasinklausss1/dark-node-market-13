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
      // Check for new deposits (individual addresses + shared/legacy + centralized address flow)
      const [userDepositRes, sharedDepositRes, centralDepositRes] = await Promise.all([
        supabase.functions.invoke('check-user-deposits'),
        supabase.functions.invoke('check-crypto-deposits'),
        supabase.functions.invoke('check-central-deposits'),
      ]);

      if (userDepositRes.error) throw userDepositRes.error;
      if (sharedDepositRes.error) throw sharedDepositRes.error;
      if (centralDepositRes.error) throw centralDepositRes.error;

      // Refresh balance after checking
      await fetchBalance();

      toast({
        title: "Aktualisiert",
        description: "Auf neue Zahlungen geprüft. Es kann bis zu 30 Minuten dauern, bis alles überall aktualisiert ist.",
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="text-base sm:text-lg">Wallet-Guthaben</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPayments}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 h-9 text-xs sm:text-sm self-stretch sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Prüfe...' : 'Aktualisieren'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
        {/* Crypto Balances - Stacked on Mobile */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {/* Bitcoin Balance */}
          <div className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20 p-3 sm:p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 sm:p-2 bg-orange-500/10 rounded-lg">
                  <Bitcoin className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
                <h4 className="font-medium text-sm sm:text-base">Bitcoin</h4>
              </div>
              <span className="text-xs text-muted-foreground">BTC</span>
            </div>
            <div className="space-y-1">
              <div className="text-lg sm:text-2xl font-bold tracking-tight">
                {balance?.balance_btc?.toFixed(8) || '0.00000000'}
              </div>
              {btcPrice && balance?.balance_btc !== undefined && (
                <div className="text-sm sm:text-base font-semibold text-primary">
                  ≈ €{(balance.balance_btc * btcPrice).toFixed(2)}
                </div>
              )}
              <div className="text-[10px] sm:text-xs text-muted-foreground pt-1">
                Verfügbar für Einkäufe
              </div>
            </div>
          </div>

          {/* Litecoin Balance */}
          <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20 p-3 sm:p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
                  <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <h4 className="font-medium text-sm sm:text-base">Litecoin</h4>
              </div>
              <span className="text-xs text-muted-foreground">LTC</span>
            </div>
            <div className="space-y-1">
              <div className="text-lg sm:text-2xl font-bold tracking-tight">
                {balance?.balance_ltc?.toFixed(8) || '0.00000000'}
              </div>
              {ltcPrice && balance?.balance_ltc !== undefined && (
                <div className="text-sm sm:text-base font-semibold text-primary">
                  ≈ €{(balance.balance_ltc * ltcPrice).toFixed(2)}
                </div>
              )}
              <div className="text-[10px] sm:text-xs text-muted-foreground pt-1">
                Verfügbar für Einkäufe
              </div>
            </div>
          </div>
        </div>

        {/* Deposit History - Compact on Mobile */}
        <div className="bg-muted/50 p-3 sm:p-4 rounded-xl">
          <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Einzahlungsverlauf</h4>
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Gesamt BTC eingezahlt:</span>
              <span className="font-mono font-medium text-[11px] sm:text-sm">
                {balance?.balance_btc_deposited?.toFixed(8) || '0.00000000'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Gesamt LTC eingezahlt:</span>
              <span className="font-mono font-medium text-[11px] sm:text-sm">
                {balance?.balance_ltc_deposited?.toFixed(8) || '0.00000000'}
              </span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
          <strong>Hinweis:</strong> Klicke auf Aktualisieren um nach neuen Zahlungen zu suchen.
        </div>
      </CardContent>
    </Card>
  );
}
