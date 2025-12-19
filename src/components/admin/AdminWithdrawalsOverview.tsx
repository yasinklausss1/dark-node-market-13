import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, ArrowUpCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Withdrawal {
  id: string;
  user_id: string;
  amount_eur: number;
  amount_crypto: number;
  currency: string;
  destination_address: string;
  status: string;
  tx_hash: string | null;
  created_at: string;
  username: string;
}

interface CreditWithdrawal {
  id: string;
  user_id: string;
  eur_amount: number;
  crypto_amount: number;
  crypto_currency: string;
  destination_address: string;
  status: string;
  tx_hash: string | null;
  created_at: string;
  username: string;
}

const AdminWithdrawalsOverview = () => {
  const [withdrawals, setWithdrawals] = useState<(Withdrawal | CreditWithdrawal)[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllWithdrawals = async () => {
    setLoading(true);
    try {
      // Fetch regular withdrawal requests
      const { data: withdrawalData, error: wError } = await supabase
        .from('withdrawal_requests')
        .select('id, user_id, amount_eur, amount_crypto, currency, destination_address, status, tx_hash, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch credit withdrawals
      const { data: creditWithdrawalData, error: cwError } = await supabase
        .from('credit_withdrawals')
        .select('id, user_id, eur_amount, crypto_amount, crypto_currency, destination_address, status, tx_hash, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (wError) console.error('Error fetching withdrawals:', wError);
      if (cwError) console.error('Error fetching credit withdrawals:', cwError);

      // Get unique user IDs from both
      const allUserIds = [
        ...new Set([
          ...(withdrawalData?.map(w => w.user_id) || []),
          ...(creditWithdrawalData?.map(w => w.user_id) || [])
        ])
      ];
      
      // Fetch profiles for usernames
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

      // Map and combine both types
      const mappedWithdrawals = (withdrawalData || []).map(w => ({
        ...w,
        username: profileMap.get(w.user_id) || 'Unbekannt',
        type: 'withdrawal' as const
      }));

      const mappedCreditWithdrawals = (creditWithdrawalData || []).map(w => ({
        id: w.id,
        user_id: w.user_id,
        amount_eur: w.eur_amount,
        amount_crypto: w.crypto_amount,
        currency: w.crypto_currency,
        destination_address: w.destination_address,
        status: w.status,
        tx_hash: w.tx_hash,
        created_at: w.created_at,
        username: profileMap.get(w.user_id) || 'Unbekannt',
        type: 'credit_withdrawal' as const
      }));

      // Combine and sort by date
      const allWithdrawals = [...mappedWithdrawals, ...mappedCreditWithdrawals]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setWithdrawals(allWithdrawals);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllWithdrawals();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-600',
      processing: 'bg-blue-500/20 text-blue-600',
      completed: 'bg-green-500/20 text-green-600',
      failed: 'bg-red-500/20 text-red-600',
      rejected: 'bg-red-500/20 text-red-600'
    };
    return (
      <Badge className={colors[status] || 'bg-muted text-muted-foreground'}>
        {status}
      </Badge>
    );
  };

  const getCurrencyColor = (currency: string) => {
    switch (currency) {
      case 'BTC': return 'text-orange-500';
      case 'LTC': return 'text-blue-500';
      case 'ETH': return 'text-purple-500';
      default: return 'text-muted-foreground';
    }
  };

  const getExplorerUrl = (currency: string, txHash: string) => {
    switch (currency) {
      case 'BTC': return `https://blockchair.com/bitcoin/transaction/${txHash}`;
      case 'LTC': return `https://blockchair.com/litecoin/transaction/${txHash}`;
      case 'ETH': return `https://etherscan.io/tx/${txHash}`;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <ArrowUpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              <span>Alle Auszahlungen</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Übersicht aller Withdrawal-Anfragen
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAllWithdrawals} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Datum</th>
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium text-right">EUR</th>
                <th className="pb-2 font-medium text-right">Krypto</th>
                <th className="pb-2 font-medium">Währung</th>
                <th className="pb-2 font-medium">Adresse</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">TX</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">Laden...</td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">Keine Auszahlungen gefunden</td>
                </tr>
              ) : (
                withdrawals.map((withdrawal: any) => (
                  <tr key={withdrawal.id} className="hover:bg-muted/30">
                    <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(withdrawal.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </td>
                    <td className="py-2 font-medium">{withdrawal.username}</td>
                    <td className="py-2 text-right">€{Number(withdrawal.amount_eur).toFixed(2)}</td>
                    <td className="py-2 text-right font-mono text-xs">
                      {Number(withdrawal.amount_crypto).toFixed(8)}
                    </td>
                    <td className={`py-2 font-medium ${getCurrencyColor(withdrawal.currency)}`}>
                      {withdrawal.currency}
                    </td>
                    <td className="py-2">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded max-w-[100px] truncate block" title={withdrawal.destination_address}>
                        {withdrawal.destination_address.slice(0, 8)}...{withdrawal.destination_address.slice(-6)}
                      </code>
                    </td>
                    <td className="py-2">
                      {getStatusBadge(withdrawal.status)}
                    </td>
                    <td className="py-2">
                      {withdrawal.tx_hash ? (
                        <a 
                          href={getExplorerUrl(withdrawal.currency, withdrawal.tx_hash) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminWithdrawalsOverview;
