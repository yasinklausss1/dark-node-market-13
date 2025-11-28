import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Wallet } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface CreditWithdrawal {
  id: string;
  credits_amount: number;
  eur_amount: number;
  crypto_currency: string;
  crypto_amount: number;
  destination_address: string;
  status: string;
  fee_eur: number;
  tx_hash: string | null;
  created_at: string;
}

export function CreditWithdrawalHistory() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<CreditWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const { btcPrice, ltcPrice } = useCryptoPrices();

  const fetchWithdrawals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('credit_withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'processing':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  const getBlockchainExplorerUrl = (txHash: string, currency: string) => {
    if (!txHash) return null;
    
    if (currency === 'BTC') {
      return `https://blockchair.com/bitcoin/transaction/${txHash}`;
    } else if (currency === 'LTC') {
      return `https://blockchair.com/litecoin/transaction/${txHash}`;
    }
    return null;
  };

  const getCurrentValue = (withdrawal: CreditWithdrawal) => {
    const price = withdrawal.crypto_currency === 'BTC' ? btcPrice : ltcPrice;
    return withdrawal.crypto_amount * price;
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Withdrawal History
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchWithdrawals} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">Loading...</p>
        ) : withdrawals.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No withdrawals found</p>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        {withdrawal.crypto_amount.toFixed(8)} {withdrawal.crypto_currency}
                      </span>
                      <Badge className={getStatusColor(withdrawal.status)}>
                        {getStatusText(withdrawal.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {withdrawal.credits_amount} Credits → €{withdrawal.eur_amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {format(new Date(withdrawal.created_at), 'dd MMM yyyy, HH:mm', { locale: enUS })}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="font-mono">
                      {withdrawal.destination_address.slice(0, 12)}...{withdrawal.destination_address.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee:</span>
                    <span>€{withdrawal.fee_eur.toFixed(2)}</span>
                  </div>
                  {withdrawal.status === 'completed' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Value:</span>
                      <span>€{getCurrentValue(withdrawal).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {withdrawal.tx_hash && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      const url = getBlockchainExplorerUrl(withdrawal.tx_hash!, withdrawal.crypto_currency);
                      if (url) window.open(url, '_blank');
                    }}
                  >
                    View Transaction <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
