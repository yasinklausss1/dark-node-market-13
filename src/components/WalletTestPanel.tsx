import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FlaskConical, Plus, Minus, AlertTriangle } from "lucide-react";

interface WalletTestPanelProps {
  onBalanceChange: () => void;
}

// ADMkz user ID - only this user can see the test panel
const ADMIN_USER_ID = "0af916bb-1c03-4173-a898-fd4274ae4a2b";

export function WalletTestPanel({ onBalanceChange }: WalletTestPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currency, setCurrency] = useState<"BTC" | "LTC">("BTC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Only show for ADMkz
  if (!user || user.id !== ADMIN_USER_ID) {
    return null;
  }

  const handleTestDeposit = async () => {
    const cryptoAmount = parseFloat(amount);
    if (isNaN(cryptoAmount) || cryptoAmount <= 0) {
      toast({
        title: "Ungültiger Betrag",
        description: "Bitte gib einen gültigen Betrag ein",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const balanceField = currency === "BTC" ? "balance_btc" : "balance_ltc";
      const depositedField = currency === "BTC" ? "balance_btc_deposited" : "balance_ltc_deposited";

      // Get current balance
      const { data: currentBalance, error: fetchError } = await supabase
        .from("wallet_balances")
        .select(`${balanceField}, ${depositedField}`)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update balance
      const newBalance = (parseFloat(currentBalance[balanceField]) || 0) + cryptoAmount;
      const newDeposited = (parseFloat(currentBalance[depositedField]) || 0) + cryptoAmount;

      const { error: updateError } = await supabase
        .from("wallet_balances")
        .update({
          [balanceField]: newBalance,
          [depositedField]: newDeposited,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Create test transaction record
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount_eur: 0, // Test transaction
        amount_btc: currency === "BTC" ? cryptoAmount : 0,
        status: "completed",
        description: `[TEST] ${currency} Einzahlung simuliert`,
        transaction_direction: "incoming",
      });

      toast({
        title: "Test-Einzahlung erfolgreich",
        description: `${cryptoAmount} ${currency} wurde deinem Guthaben hinzugefügt`,
      });

      setAmount("");
      onBalanceChange();
    } catch (error) {
      console.error("Test deposit error:", error);
      toast({
        title: "Fehler",
        description: "Test-Einzahlung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestWithdrawal = async () => {
    const cryptoAmount = parseFloat(amount);
    if (isNaN(cryptoAmount) || cryptoAmount <= 0) {
      toast({
        title: "Ungültiger Betrag",
        description: "Bitte gib einen gültigen Betrag ein",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const balanceField = currency === "BTC" ? "balance_btc" : "balance_ltc";

      // Get current balance
      const { data: currentBalance, error: fetchError } = await supabase
        .from("wallet_balances")
        .select(balanceField)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      const current = parseFloat(currentBalance[balanceField]) || 0;
      if (cryptoAmount > current) {
        toast({
          title: "Unzureichendes Guthaben",
          description: `Du hast nur ${current.toFixed(8)} ${currency} verfügbar`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update balance
      const newBalance = current - cryptoAmount;

      const { error: updateError } = await supabase
        .from("wallet_balances")
        .update({
          [balanceField]: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Create test withdrawal record
      await supabase.from("withdrawal_requests").insert({
        user_id: user.id,
        currency: currency,
        amount_eur: 0, // Test
        amount_crypto: cryptoAmount,
        destination_address: "TEST_SIMULATION_ADDRESS",
        fee_eur: 0,
        status: "completed",
        tx_hash: `TEST_TX_${Date.now()}`,
        notes: "[TEST] Simulierte Auszahlung - keine echte Blockchain-Transaktion",
      });

      // Create transaction record
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "withdrawal",
        amount_eur: 0,
        amount_btc: currency === "BTC" ? cryptoAmount : 0,
        status: "completed",
        description: `[TEST] ${currency} Auszahlung simuliert`,
        transaction_direction: "outgoing",
      });

      toast({
        title: "Test-Auszahlung erfolgreich",
        description: `${cryptoAmount} ${currency} wurde abgezogen (simuliert, keine echte TX)`,
      });

      setAmount("");
      onBalanceChange();
    } catch (error) {
      console.error("Test withdrawal error:", error);
      toast({
        title: "Fehler",
        description: "Test-Auszahlung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetBalance = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("wallet_balances")
        .update({
          balance_btc: 0,
          balance_ltc: 0,
          balance_btc_deposited: 0,
          balance_ltc_deposited: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Guthaben zurückgesetzt",
        description: "Alle Krypto-Guthaben wurden auf 0 gesetzt",
      });

      onBalanceChange();
    } catch (error) {
      console.error("Reset error:", error);
      toast({
        title: "Fehler",
        description: "Zurücksetzen fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-600">
          <FlaskConical className="h-5 w-5" />
          Test-Modus (nur ADMkz)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-700 dark:text-yellow-400">
            Dieses Panel simuliert Einzahlungen und Auszahlungen ohne echte Blockchain-Transaktionen. 
            Nur für Testzwecke!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Währung</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as "BTC" | "LTC")}>
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
            <Label>Betrag ({currency})</Label>
            <Input
              type="number"
              step="0.00000001"
              min="0"
              placeholder="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleTestDeposit}
            disabled={loading || !amount}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Test-Einzahlung
          </Button>

          <Button
            onClick={handleTestWithdrawal}
            disabled={loading || !amount}
            variant="outline"
            className="flex items-center gap-2 border-red-500 text-red-500 hover:bg-red-500/10"
          >
            <Minus className="h-4 w-4" />
            Test-Auszahlung
          </Button>

          <Button
            onClick={handleResetBalance}
            disabled={loading}
            variant="ghost"
            className="text-muted-foreground"
          >
            Guthaben zurücksetzen
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Schnelltest-Beträge:</strong></p>
          <div className="flex gap-2 mt-1">
            {["0.001", "0.01", "0.1"].map((val) => (
              <Button
                key={val}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setAmount(val)}
              >
                {val} {currency}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
