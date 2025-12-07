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
  balance_eur: number;
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

  useEffect(() => {
    if (open && user) {
      fetchBalance();
      fetchFees();
      fetchLimits();
    }
  }, [open, user]);

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

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Auszahlung fehlgeschlagen",
        description: error.message || "Auszahlung konnte nicht verarbeitet werden",
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

        <div className="space-y-6">
          {/* Currency Selection */}
          <div className="space-y-3">
            <Label>Währung auswählen</Label>
            <RadioGroup
              value={selectedCrypto}
              onValueChange={(value: 'BTC' | 'LTC') => setSelectedCrypto(value)}
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="BTC" id="btc" />
                <Label htmlFor="btc" className="flex items-center gap-2">
                  Bitcoin (BTC)
                  {balance && (
                    <span className="text-sm text-muted-foreground">
                      {balance.balance_btc.toFixed(8)} BTC
                    </span>
                  )}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="LTC" id="ltc" />
                <Label htmlFor="ltc" className="flex items-center gap-2">
                  Litecoin (LTC)
                  {balance && (
                    <span className="text-sm text-muted-foreground">
                      {balance.balance_ltc.toFixed(8)} LTC
                    </span>
                  )}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Betrag (EUR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Betrag in EUR eingeben"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={fee?.min_amount_eur || 0}
              step="0.01"
            />
            {fee && (
              <p className="text-sm text-muted-foreground">
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

          {/* Fee Information */}
          {calculation && fee && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <h4 className="font-medium">Transaktionsdetails</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Betrag:</span>
                  <span>{amount} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span>Grundgebühr:</span>
                  <span>{fee.base_fee_eur.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span>Prozentuale Gebühr ({(fee.percentage_fee * 100).toFixed(1)}%):</span>
                  <span>{((parseFloat(amount) || 0) * fee.percentage_fee).toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Gebühren gesamt:</span>
                  <span>{calculation.totalFee.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Du erhältst:</span>
                  <span>≈ {calculation.cryptoAmount.toFixed(8)} {selectedCrypto}</span>
                </div>
              </div>
              
              {/* Transaction Time Information */}
              <div className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Bearbeitungszeit:</span>
                  <span>~2-5 Minuten</span>
                </div>
                <div className="flex justify-between">
                  <span>Netzwerk-Bestätigung:</span>
                  <span>{selectedCrypto === 'BTC' ? '~10-60 Min' : selectedCrypto === 'LTC' ? '~2,5-15 Min' : '~20-30 Min'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vollständige Abwicklung:</span>
                  <span>{selectedCrypto === 'BTC' ? '~1-3 Stunden' : selectedCrypto === 'LTC' ? '~15-45 Min' : '~30-60 Min'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Limits Information */}
          {limits && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <h4 className="font-medium">Auszahlungslimits</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Tägliches Limit:</span>
                  <span>{limits.withdrawal_limit_daily_eur} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span>Heute verwendet:</span>
                  <span>{limits.daily_spent.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span>Monatliches Limit:</span>
                  <span>{limits.withdrawal_limit_monthly_eur} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span>Monatlich verwendet:</span>
                  <span>{limits.monthly_spent.toFixed(2)} EUR</span>
                </div>
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
