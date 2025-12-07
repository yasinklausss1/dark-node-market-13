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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Auszahlungsverlauf</CardTitle>
            <CardDescription>
              Deine letzten Kryptowährungs-Auszahlungen
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchWithdrawals}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {withdrawals.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Keine Auszahlungen gefunden</p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(withdrawal.status)}
                    <Badge className={getStatusColor(withdrawal.status)}>
                      {getStatusLabel(withdrawal.status)}
                    </Badge>
                    <span className="font-medium">
                      {withdrawal.amount_crypto.toFixed(8)} {withdrawal.currency}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {withdrawal.amount_eur.toFixed(2)} EUR
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Gebühr: {withdrawal.fee_eur.toFixed(2)} EUR
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">An:</span>
                    <span className="font-mono text-xs">
                      {withdrawal.destination_address.slice(0, 20)}...
                      {withdrawal.destination_address.slice(-10)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Datum:</span>
                    <span>
                      {new Date(withdrawal.created_at).toLocaleDateString('de-DE')} {' '}
                      {new Date(withdrawal.created_at).toLocaleTimeString('de-DE')}
                    </span>
                  </div>

                  {withdrawal.processed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verarbeitet:</span>
                      <span>
                        {new Date(withdrawal.processed_at).toLocaleDateString('de-DE')} {' '}
                        {new Date(withdrawal.processed_at).toLocaleTimeString('de-DE')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aktueller Wert:</span>
                    <span>
                      {getCurrentValue(withdrawal).toFixed(2)} EUR
                    </span>
                  </div>

                  {withdrawal.tx_hash && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Transaktion:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-blue-600 hover:text-blue-800"
                        onClick={() => window.open(
                          getBlockchainExplorerUrl(withdrawal.tx_hash!, withdrawal.currency),
                          '_blank'
                        )}
                      >
                        <span className="font-mono text-xs">
                          {withdrawal.tx_hash.slice(0, 8)}...{withdrawal.tx_hash.slice(-8)}
                        </span>
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}

                  {withdrawal.notes && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hinweise:</span>
                      <span className="text-red-600 text-xs">
                        {withdrawal.notes}
                      </span>
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
