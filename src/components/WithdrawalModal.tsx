import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { useToast } from '@/hooks/use-toast';

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWithdrawalSuccess?: () => void;
}

interface WalletBalance {
  balance_btc: number;
  balance_ltc: number;
}

interface WithdrawalFees {
  currency: string;
  min_amount_eur: number;
  base_fee_eur: number;
  percentage_fee: number;
  network_fee_crypto: number;
}

interface WithdrawalLimits {
  withdrawal_limit_daily_eur: number;
  withdrawal_limit_monthly_eur: number;
  daily_spent: number;
  monthly_spent: number;
}

interface PoolLiquidity {
  btc: number | null;
  ltc: number | null;
  loading: boolean;
}

export default function WithdrawalModal({ open, onOpenChange, onWithdrawalSuccess }: WithdrawalModalProps) {
  const { user } = useAuth();
  const { btcPrice, ltcPrice } = useCryptoPrices();
  const { toast } = useToast();

  const [selectedCrypto, setSelectedCrypto] = useState<'BTC' | 'LTC'>('BTC');
  const [amount, setAmount] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [fees, setFees] = useState<WithdrawalFees[]>([]);
  const [limits, setLimits] = useState<WithdrawalLimits | null>(null);
  const [withdrawalResult, setWithdrawalResult] = useState<any>(null);
  const [poolLiquidity, setPoolLiquidity] = useState<PoolLiquidity>({ btc: null, ltc: null, loading: false });

  useEffect(() => {
    if (open && user) {
      fetchBalance();
      fetchFees();
      fetchLimits();
      fetchPoolLiquidity();
    }
  }, [open, user]);

  const fetchPoolLiquidity = async () => {
    setPoolLiquidity(prev => ({ ...prev, loading: true }));
    try {
      // Fetch pool addresses from database
      const { data: poolAddresses, error: poolError } = await supabase
        .from('admin_fee_addresses')
        .select('currency, address');
      
      if (poolError) {
        console.error('Error fetching pool addresses:', poolError);
        setPoolLiquidity({ btc: null, ltc: null, loading: false });
        return;
      }

      const btcPoolAddress = poolAddresses?.find(a => a.currency === 'BTC')?.address;
      const ltcPoolAddress = poolAddresses?.find(a => a.currency === 'LTC')?.address;

      let btcBalance = null;
      let ltcBalance = null;

      // Fetch BTC pool balance
      if (btcPoolAddress) {
        const btcResponse = await fetch(`https://mempool.space/api/address/${btcPoolAddress}`);
        if (btcResponse.ok) {
          const btcData = await btcResponse.json();
          const satoshis = (btcData.chain_stats?.funded_txo_sum || 0) - (btcData.chain_stats?.spent_txo_sum || 0);
          btcBalance = satoshis / 100000000;
        }
      }

      // Fetch LTC pool balance
      if (ltcPoolAddress) {
        const ltcResponse = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${ltcPoolAddress}/balance`);
        if (ltcResponse.ok) {
          const ltcData = await ltcResponse.json();
          ltcBalance = (ltcData.balance || 0) / 100000000;
        }
      }

      setPoolLiquidity({ btc: btcBalance, ltc: ltcBalance, loading: false });
    } catch (error) {
      console.error('Error fetching pool liquidity:', error);
      setPoolLiquidity({ btc: null, ltc: null, loading: false });
    }
  };

  const fetchBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallet_balances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setBalance(data);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: "Fehler",
        description: "Wallet-Guthaben konnte nicht geladen werden",
        variant: "destructive",
      });
    }
  };

  const fetchFees = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_fees')
        .select('*');

      if (error) throw error;
      setFees(data || []);
    } catch (error) {
      console.error('Error fetching fees:', error);
    }
  };

  const fetchLimits = async () => {
    if (!user) return;

    try {
      // Get security settings
      const { data: securityData, error: securityError } = await supabase
        .from('wallet_security')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get spent amounts
      const { data: spentData, error: spentError } = await supabase
        .from('withdrawal_requests')
        .select('amount_eur, created_at')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing', 'completed']);

      if (spentError) throw spentError;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const dailySpent = spentData
        ?.filter(tx => new Date(tx.created_at) >= startOfDay)
        .reduce((sum, tx) => sum + tx.amount_eur, 0) || 0;

      const monthlySpent = spentData
        ?.filter(tx => new Date(tx.created_at) >= startOfMonth)
        .reduce((sum, tx) => sum + tx.amount_eur, 0) || 0;

      setLimits({
        withdrawal_limit_daily_eur: securityData?.withdrawal_limit_daily_eur || 500,
        withdrawal_limit_monthly_eur: securityData?.withdrawal_limit_monthly_eur || 5000,
        daily_spent: dailySpent,
        monthly_spent: monthlySpent
      });
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  };

  const getCurrentFee = () => {
    return fees.find(fee => fee.currency === selectedCrypto);
  };

  const calculateWithdrawal = () => {
    const amountEur = parseFloat(amount);
    if (!amountEur || !getCurrentFee()) return null;

    const fee = getCurrentFee()!;
    const percentageFee = amountEur * fee.percentage_fee;
    const totalFee = fee.base_fee_eur + percentageFee;
    const netAmount = amountEur - totalFee;

    const cryptoPrice = selectedCrypto === 'BTC' ? btcPrice : ltcPrice;
    const cryptoAmount = cryptoPrice ? netAmount / cryptoPrice : 0;

    return {
      totalFee,
      netAmount,
      cryptoAmount
    };
  };

  // Calculate max withdrawal based on balance, limits, and pool liquidity
  const getMaxWithdrawal = () => {
    if (!balance || !limits || !fees.length) return 0;

    const cryptoPrice = selectedCrypto === 'BTC' ? btcPrice : ltcPrice;
    if (!cryptoPrice) return 0;

    const currentBalance = selectedCrypto === 'BTC' ? balance.balance_btc : balance.balance_ltc;
    const balanceInEur = currentBalance * cryptoPrice;

    // Pool liquidity limit
    const currentPoolBalance = selectedCrypto === 'BTC' ? poolLiquidity.btc : poolLiquidity.ltc;
    const poolLiquidityInEur = currentPoolBalance !== null ? currentPoolBalance * cryptoPrice : Infinity;

    // Daily/monthly remaining
    const dailyRemaining = limits.withdrawal_limit_daily_eur - limits.daily_spent;
    const monthlyRemaining = limits.withdrawal_limit_monthly_eur - limits.monthly_spent;

    // Get the minimum of all constraints
    const maxAmount = Math.min(balanceInEur, poolLiquidityInEur * 0.95, dailyRemaining, monthlyRemaining);
    
    return Math.max(0, Math.floor(maxAmount * 100) / 100); // Round down to 2 decimals
  };

  const handleSetMaxAmount = () => {
    const maxAmount = getMaxWithdrawal();
    if (maxAmount > 0) {
      setAmount(maxAmount.toString());
    }
  };

  const validateWithdrawal = () => {
    const amountEur = parseFloat(amount);
    const calculation = calculateWithdrawal();
    const fee = getCurrentFee();

    if (!amountEur || !calculation || !fee || !balance || !limits) {
      return { valid: false, error: 'Fehlende Daten' };
    }

    if (amountEur < fee.min_amount_eur) {
      return { valid: false, error: `Mindestbetrag ist ${fee.min_amount_eur} EUR` };
    }

    if (calculation.netAmount <= 0) {
      return { valid: false, error: 'Betrag nach Gebühren zu gering' };
    }

    const currentBalance = selectedCrypto === 'BTC' ? balance.balance_btc : balance.balance_ltc;
    if (currentBalance < calculation.cryptoAmount) {
      return { valid: false, error: 'Unzureichendes Guthaben' };
    }

    if (limits.daily_spent + amountEur > limits.withdrawal_limit_daily_eur) {
      return { valid: false, error: 'Tägliches Auszahlungslimit überschritten' };
    }

    if (limits.monthly_spent + amountEur > limits.withdrawal_limit_monthly_eur) {
      return { valid: false, error: 'Monatliches Auszahlungslimit überschritten' };
    }

    // Basic address validation
    if (selectedCrypto === 'BTC') {
      const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
      if (!btcRegex.test(destinationAddress)) {
        return { valid: false, error: 'Ungültige Bitcoin-Adresse' };
      }
    } else {
      const ltcRegex = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/;
      if (!ltcRegex.test(destinationAddress)) {
        return { valid: false, error: 'Ungültige Litecoin-Adresse' };
      }
    }

    // Check pool liquidity
    const currentPoolBalance = selectedCrypto === 'BTC' ? poolLiquidity.btc : poolLiquidity.ltc;
    if (currentPoolBalance !== null && currentPoolBalance < calculation.cryptoAmount) {
      return { 
        valid: false, 
        error: `Unzureichende Pool-Liquidität. Der ${selectedCrypto}-Pool hat aktuell nur ${currentPoolBalance.toFixed(8)} ${selectedCrypto} verfügbar.` 
      };
    }

    return { valid: true };
  };

  const handleWithdrawal = async () => {
    if (!user) return;

    const validation = validateWithdrawal();
    if (!validation.valid) {
      toast({
        title: "Ungültige Auszahlung",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-crypto-withdrawal', {
        body: {
          amount: parseFloat(amount),
          currency: selectedCrypto,
          destinationAddress: destinationAddress
        }
      });

      if (error) throw error;

      setWithdrawalResult(data);
      setAmount('');
      setDestinationAddress('');
      
      toast({
        title: "Auszahlung eingeleitet",
        description: `Deine ${selectedCrypto}-Auszahlung wird verarbeitet`,
      });

      if (onWithdrawalSuccess) {
        onWithdrawalSuccess();
      }

    } catch (error: any) {
      console.error('Withdrawal error:', error);
      
      // Parse error message for pool liquidity issues
      let errorMessage = error.message || "Auszahlung konnte nicht verarbeitet werden";
      if (errorMessage.includes('Pool-Liquidität') || errorMessage.includes('pool')) {
        errorMessage = `Unzureichende Pool-Liquidität. Bitte versuche es später erneut oder wähle einen kleineren Betrag.`;
        // Refresh pool liquidity
        fetchPoolLiquidity();
      }
      
      toast({
        title: "Auszahlung fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setAmount('');
    setDestinationAddress('');
    setWithdrawalResult(null);
    setSelectedCrypto('BTC');
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  const calculation = calculateWithdrawal();
  const validation = validateWithdrawal();
  const fee = getCurrentFee();

  if (withdrawalResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Auszahlung eingeleitet
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Deine Auszahlung wird verarbeitet. Du erhältst {withdrawalResult.estimated_crypto_amount?.toFixed(8)} {selectedCrypto} an die Zieladresse innerhalb von {selectedCrypto === 'BTC' ? '1-3 Stunden' : selectedCrypto === 'LTC' ? '15-45 Minuten' : '30-60 Minuten'} je nach Netzwerkauslastung.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Auszahlungs-ID:</span>
                <span className="font-mono">{withdrawalResult.withdrawal_id?.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Betrag:</span>
                <span>{amount} EUR</span>
              </div>
              <div className="flex justify-between">
                <span>Gebühren:</span>
                <span>{withdrawalResult.fee_eur?.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between">
                <span>Nettobetrag:</span>
                <span>{withdrawalResult.net_amount_eur?.toFixed(2)} EUR</span>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kryptowährung auszahlen</DialogTitle>
          <DialogDescription>
            Auszahlung auf externe Wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currency Selection - Compact */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={selectedCrypto === 'BTC' ? 'default' : 'outline'}
              onClick={() => setSelectedCrypto('BTC')}
              className="flex-1"
            >
              Bitcoin (BTC)
            </Button>
            <Button
              type="button"
              variant={selectedCrypto === 'LTC' ? 'default' : 'outline'}
              onClick={() => setSelectedCrypto('LTC')}
              className="flex-1"
            >
              Litecoin (LTC)
            </Button>
          </div>

          {/* Balance & Max Amount Info */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Dein {selectedCrypto} Guthaben:</span>
              <span className="font-mono text-sm font-bold">
                {balance ? (selectedCrypto === 'BTC' ? balance.balance_btc.toFixed(8) : balance.balance_ltc.toFixed(8)) : '0'} {selectedCrypto}
              </span>
            </div>
            {(btcPrice || ltcPrice) && balance && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">EUR-Wert:</span>
                <span className="text-sm text-primary">
                  ≈ €{((selectedCrypto === 'BTC' ? balance.balance_btc : balance.balance_ltc) * (selectedCrypto === 'BTC' ? btcPrice! : ltcPrice!)).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Max. auszahlbar:</span>
              <span className="font-semibold text-primary">{getMaxWithdrawal().toFixed(2)} EUR</span>
            </div>
          </div>

          {/* Amount Input with Max Button */}
          <div className="space-y-2">
            <Label htmlFor="amount">Betrag (EUR)</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                placeholder="Betrag in EUR"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={fee?.min_amount_eur || 0}
                max={getMaxWithdrawal()}
                step="0.01"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleSetMaxAmount}
                disabled={getMaxWithdrawal() <= 0}
                className="px-4"
              >
                Max
              </Button>
            </div>
            {fee && (
              <p className="text-xs text-muted-foreground">
                Minimum: {fee.min_amount_eur} EUR
              </p>
            )}
          </div>

          {/* Destination Address */}
          <div className="space-y-2">
            <Label htmlFor="address">{selectedCrypto}-Adresse</Label>
            <Input
              id="address"
              placeholder={`${selectedCrypto}-Adresse eingeben`}
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {/* Fee Summary - Compact */}
          {calculation && fee && (
            <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Gebühren:</span>
                <span>{calculation.totalFee.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between font-semibold text-base">
                <span>Du erhältst:</span>
                <span className="text-primary">≈ {calculation.cryptoAmount.toFixed(8)} {selectedCrypto}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {!validation.valid && amount && destinationAddress && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validation.error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Abbrechen
            </Button>
            <Button 
              onClick={handleWithdrawal}
              disabled={loading || !validation.valid || !amount || !destinationAddress}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Auszahlen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
