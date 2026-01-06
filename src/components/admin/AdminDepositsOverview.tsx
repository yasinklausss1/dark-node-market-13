import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Deposit {
  id: string;
  user_id: string;
  currency: string;
  requested_amount_crypto: number;
  received_amount_crypto: number | null;
  status: string;
  created_at: string;
  tx_hash: string | null;
  username: string;
}

const AdminDepositsOverview = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllDeposits = async () => {
    setLoading(true);
    try {
      const { data: depositsData, error } = await supabase
        .from('deposit_addresses')
        .select('id, user_id, currency, requested_amount_crypto, received_amount_crypto, status, created_at, tx_hash')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(depositsData?.map(d => d.user_id) || [])];
      
      // Fetch profiles for usernames
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

      const depositsWithUsernames: Deposit[] = (depositsData || []).map(d => ({
        ...d,
        username: profileMap.get(d.user_id) || 'Unbekannt'
      }));

      setDeposits(depositsWithUsernames);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDeposits();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-600',
      confirmed: 'bg-green-500/20 text-green-600',
      completed: 'bg-green-500/20 text-green-600',
      closed: 'bg-muted text-muted-foreground',
      expired: 'bg-red-500/20 text-red-600'
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

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <ArrowDownCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              <span>Alle Einzahlungen</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Übersicht aller Deposit-Anfragen
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAllDeposits} disabled={loading}>
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
                <th className="pb-2 font-medium">Währung</th>
                <th className="pb-2 font-medium text-right">Angefordert</th>
                <th className="pb-2 font-medium text-right">Erhalten</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">Laden...</td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">Keine Einzahlungen gefunden</td>
                </tr>
              ) : (
                deposits.map(deposit => (
                  <tr key={deposit.id} className="hover:bg-muted/30">
                    <td className="py-2 text-xs text-muted-foreground">
                      {format(new Date(deposit.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </td>
                    <td className="py-2 font-medium">{deposit.username}</td>
                    <td className={`py-2 font-medium ${getCurrencyColor(deposit.currency)}`}>
                      {deposit.currency}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {Number(deposit.requested_amount_crypto).toFixed(8)}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {deposit.received_amount_crypto ? Number(deposit.received_amount_crypto).toFixed(8) : '-'}
                    </td>
                    <td className="py-2">
                      {getStatusBadge(deposit.status)}
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

export default AdminDepositsOverview;
