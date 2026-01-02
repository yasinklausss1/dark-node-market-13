import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';

interface WithdrawalRequest {
  id: string;
  amount_eur: number;
  amount_crypto: number;
  currency: string;
  destination_address: string;
  status: string;
  tx_hash: string | null;
  fee_eur: number;
  created_at: string;
  processed_at: string | null;
  notes: string | null;
}

export default function WithdrawalHistory() {
  const { user } = useAuth();
  const { btcPrice, ltcPrice } = useCryptoPrices();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWithdrawals();
    }
  }, [user]);

  const fetchWithdrawals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'processing': return 'In Bearbeitung';
      case 'completed': return 'Abgeschlossen';
      case 'failed': return 'Fehlgeschlagen';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  const getBlockchainExplorerUrl = (txHash: string, currency: string) => {
    if (currency === 'BTC') {
      return `https://blockstream.info/tx/${txHash}`;
    } else if (currency === 'LTC') {
      return `https://litecoinspace.org/tx/${txHash}`;
    }
    return '#';
  };

  const getCurrentValue = (withdrawal: WithdrawalRequest) => {
    const price = withdrawal.currency === 'BTC' ? btcPrice : ltcPrice;
    return price ? withdrawal.amount_crypto * price : 0;
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Auszahlungsverlauf</CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-0.5">
              Deine Krypto-Auszahlungen
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchWithdrawals}
            disabled={loading}
            className="h-9 w-9 p-0 flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
        {withdrawals.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Keine Auszahlungen</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
            {withdrawals.map((withdrawal) => (
              <div 
                key={withdrawal.id} 
                className="border rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3 bg-card/50"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    {getStatusIcon(withdrawal.status)}
                    <Badge className={`${getStatusColor(withdrawal.status)} text-[10px] sm:text-xs px-1.5 sm:px-2`}>
                      {getStatusLabel(withdrawal.status)}
                    </Badge>
                    <span className="font-medium text-xs sm:text-sm truncate">
                      {withdrawal.amount_crypto.toFixed(6)} {withdrawal.currency}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-medium text-xs sm:text-sm">
                      €{withdrawal.amount_eur.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1 text-[10px] sm:text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">An:</span>
                    <span className="font-mono truncate max-w-[150px] sm:max-w-[200px]">
                      {withdrawal.destination_address.slice(0, 12)}...{withdrawal.destination_address.slice(-6)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Datum:</span>
                    <span>
                      {new Date(withdrawal.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gebühr:</span>
                    <span>€{withdrawal.fee_eur.toFixed(2)}</span>
                  </div>

                  {withdrawal.tx_hash && (
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-muted-foreground">TX:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-primary hover:text-primary/80 text-[10px] sm:text-xs"
                        onClick={() => window.open(
                          getBlockchainExplorerUrl(withdrawal.tx_hash!, withdrawal.currency),
                          '_blank'
                        )}
                      >
                        <span className="font-mono">
                          {withdrawal.tx_hash.slice(0, 6)}...{withdrawal.tx_hash.slice(-6)}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1" />
                      </Button>
                    </div>
                  )}

                  {withdrawal.notes && (
                    <div className="pt-1 text-red-500 text-[10px] sm:text-xs">
                      {withdrawal.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
