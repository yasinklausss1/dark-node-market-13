import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface CreditWithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreditWithdrawalModal({ open, onOpenChange, onSuccess }: CreditWithdrawalModalProps) {
  const [creditAmount, setCreditAmount] = useState("");
  const [currency, setCurrency] = useState<"BTC" | "LTC">("BTC");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);
  const { btcPrice, ltcPrice, loading: pricesLoading } = useCryptoPrices();

  useEffect(() => {
    const fetchBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('wallet_balances')
        .select('balance_credits')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setAvailableCredits(data.balance_credits);
      }
    };

    if (open) {
      fetchBalance();
    }
  }, [open]);

  const platformFeePercent = 5;
  const credits = Number(creditAmount) || 0;
  const eurAmount = credits; // 1 credit = 1 EUR
  const platformFee = eurAmount * (platformFeePercent / 100);
  const eurAfterFee = eurAmount - platformFee;
  
  const cryptoPrice = currency === "BTC" ? btcPrice : ltcPrice;
  const estimatedCrypto = cryptoPrice > 0 ? eurAfterFee / cryptoPrice : 0;

  const hasInsufficientCredits = credits > availableCredits;
  const canSubmit = !isSubmitting && destinationAddress && credits > 0 && !hasInsufficientCredits;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!destinationAddress || credits <= 0) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-credit-withdrawal', {
        body: {
          credits_amount: credits,
          crypto_currency: currency,
          destination_address: destinationAddress,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Auszahlung erfolgreich beantragt!");
        onSuccess();
        onOpenChange(false);
        setCreditAmount("");
        setDestinationAddress("");
      } else {
        toast.error(data.error || "Auszahlung fehlgeschlagen");
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || "Fehler bei der Auszahlung");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Credits zu Crypto auszahlen</DialogTitle>
          <DialogDescription>
            Wandle deine Credits in Kryptowährung um und erhalte sie auf deine Wallet
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Verfügbare Credits: <strong>{availableCredits}</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="currency">Kryptowährung</Label>
            <Select value={currency} onValueChange={(value: "BTC" | "LTC") => setCurrency(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="LTC">Litecoin (LTC)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credits">Credits Betrag</Label>
            <Input
              id="credits"
              type="number"
              min="1"
              max={availableCredits}
              step="1"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="Anzahl Credits"
              className={hasInsufficientCredits ? "border-red-500" : ""}
            />
            {hasInsufficientCredits && (
              <p className="text-sm text-red-500">
                Nicht genug Credits verfügbar
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Zieladresse ({currency})</Label>
            <Input
              id="address"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder={currency === "BTC" ? "bc1..." : "L..."}
            />
          </div>

          {credits > 0 && !pricesLoading && (
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Credits:</span>
                <span className="font-semibold">{credits}</span>
              </div>
              <div className="flex justify-between">
                <span>EUR Wert:</span>
                <span>€{eurAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Plattform-Gebühr ({platformFeePercent}%):</span>
                <span>-€{platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Nach Gebühren:</span>
                <span className="font-semibold">€{eurAfterFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span>Geschätzt:</span>
                <span className="font-bold text-primary">
                  {estimatedCrypto.toFixed(8)} {currency}
                </span>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird bearbeitet...
              </>
            ) : (
              <>
                Auszahlung beantragen
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          
          {availableCredits === 0 && (
            <p className="text-sm text-center text-muted-foreground">
              Du benötigst Credits, um eine Auszahlung zu machen. Kaufe Credits über "Credits kaufen".
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
