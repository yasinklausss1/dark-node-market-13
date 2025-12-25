import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bitcoin, Copy, Download, RefreshCw, Wallet, TrendingUp } from 'lucide-react';

interface FeeAddress {
  id: string;
  currency: string;
  address: string;
  balance: number;
}

interface FeeTransaction {
  id: string;
  order_id: string;
  amount_eur: number;
  amount_crypto: number;
  currency: string;
  transaction_type: string;
  created_at: string;
  tx_hash?: string;
}

export const AdminFeeWallet: React.FC = () => {
  const { toast } = useToast();
  const [feeAddresses, setFeeAddresses] = useState<FeeAddress[]>([]);
  const [feeTransactions, setFeeTransactions] = useState<FeeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    currency: 'BTC',
    amount: '',
    address: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch fee addresses
      const { data: addresses, error: addrError } = await supabase
        .from('admin_fee_addresses')
        .select('*');

      if (addrError) throw addrError;
      setFeeAddresses(addresses || []);

      // Fetch fee transactions
      const { data: transactions, error: txError } = await supabase
        .from('admin_fee_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) throw txError;
      setFeeTransactions(transactions || []);
    } catch (error: any) {
      console.error('Error fetching fee data:', error);
      toast({
        title: 'Fehler',
        description: 'Gebühren-Daten konnten nicht geladen werden',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAddresses = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-admin-fee-addresses', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Erfolg',
        description: 'Gebühren-Adressen wurden generiert'
      });
      
      await fetchData();
    } catch (error: any) {
      console.error('Error generating addresses:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Adressen konnten nicht generiert werden',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawForm.amount || !withdrawForm.address) {
      toast({
        title: 'Fehler',
        description: 'Bitte Betrag und Zieladresse eingeben',
        variant: 'destructive'
      });
      return;
    }

    setWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('withdraw-admin-fees', {
        body: {
          currency: withdrawForm.currency,
          amount: parseFloat(withdrawForm.amount),
          destinationAddress: withdrawForm.address
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Erfolg',
        description: `Auszahlung erfolgreich! TX: ${data.txHash?.slice(0, 16)}...`
      });
      
      setWithdrawForm({ ...withdrawForm, amount: '', address: '' });
      await fetchData();
    } catch (error: any) {
      console.error('Error withdrawing fees:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Auszahlung fehlgeschlagen',
        variant: 'destructive'
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Kopiert',
      description: 'Adresse wurde in die Zwischenablage kopiert'
    });
  };

  const btcAddress = feeAddresses.find(a => a.currency === 'BTC');
  const ltcAddress = feeAddresses.find(a => a.currency === 'LTC');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gebühren-Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Gebühren-Wallet
              </CardTitle>
              <CardDescription>Deine gesammelten Plattform-Gebühren</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {feeAddresses.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Noch keine Gebühren-Adressen generiert
              </p>
              <Button onClick={generateAddresses} disabled={generating}>
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <Bitcoin className="h-4 w-4 mr-2" />
                    Adressen generieren
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BTC Balance */}
              <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium flex items-center gap-2">
                    <Bitcoin className="h-4 w-4 text-orange-500" />
                    Bitcoin (BTC)
                  </span>
                  <Badge variant="secondary">Gebühren</Badge>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {btcAddress ? Number(btcAddress.balance).toFixed(8) : '0.00000000'} BTC
                </p>
                {btcAddress && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded truncate flex-1">
                      {btcAddress.address}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(btcAddress.address)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* LTC Balance */}
              <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-950/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium flex items-center gap-2">
                    <Bitcoin className="h-4 w-4 text-slate-500" />
                    Litecoin (LTC)
                  </span>
                  <Badge variant="secondary">Gebühren</Badge>
                </div>
                <p className="text-2xl font-bold text-slate-600">
                  {ltcAddress ? Number(ltcAddress.balance).toFixed(8) : '0.00000000'} LTC
                </p>
                {ltcAddress && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded truncate flex-1">
                      {ltcAddress.address}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(ltcAddress.address)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Form */}
      {feeAddresses.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Gebühren auszahlen
            </CardTitle>
            <CardDescription>
              Überweise deine gesammelten Gebühren an eine externe Wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Währung</Label>
                <select 
                  className="w-full p-2 border rounded-md bg-background"
                  value={withdrawForm.currency}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, currency: e.target.value })}
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="LTC">Litecoin (LTC)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Betrag</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  placeholder="0.00000000"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max. verfügbar</Label>
                <p className="text-sm text-muted-foreground pt-2">
                  {withdrawForm.currency === 'BTC' 
                    ? `${Number(btcAddress?.balance || 0).toFixed(8)} BTC`
                    : `${Number(ltcAddress?.balance || 0).toFixed(8)} LTC`
                  }
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zieladresse</Label>
              <Input
                placeholder={withdrawForm.currency === 'BTC' ? 'bc1q...' : 'ltc1q...'}
                value={withdrawForm.address}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, address: e.target.value })}
              />
            </div>
            <Button 
              onClick={handleWithdraw} 
              disabled={withdrawing || !withdrawForm.amount || !withdrawForm.address}
              className="w-full"
            >
              {withdrawing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Wird verarbeitet...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Auszahlung starten
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      {feeTransactions.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg">Gebühren-Transaktionen</CardTitle>
            <CardDescription>Übersicht der gesammelten und ausgezahlten Gebühren</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {feeTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {tx.transaction_type === 'fee_collected' ? 'Gebühr erhalten' : 'Auszahlung'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString('de-DE')}
                      {tx.order_id && tx.order_id !== '00000000-0000-0000-0000-000000000000' && (
                        <> • Order #{tx.order_id.slice(0, 8)}</>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.transaction_type === 'fee_collected' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.transaction_type === 'fee_collected' ? '+' : '-'}
                      {Number(tx.amount_crypto).toFixed(8)} {tx.currency}
                    </p>
                    {tx.amount_eur > 0 && (
                      <p className="text-xs text-muted-foreground">
                        €{Number(tx.amount_eur).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};