import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const CreditBalance = () => {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wallet_balances')
        .select('balance_credits')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no wallet balance exists, create one
      if (!data) {
        const { error: insertError } = await supabase
          .from('wallet_balances')
          .insert({ user_id: user.id, balance_credits: 0 });
        
        if (insertError) throw insertError;
        setCredits(0);
      } else {
        setCredits(data.balance_credits || 0);
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      toast({
        title: "Error",
        description: "Failed to load credit balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallet_balances'
        },
        () => {
          fetchBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchBalance}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Coins className="h-8 w-8 text-primary" />
          <div className="text-3xl font-bold">
            {loading ? '...' : credits.toLocaleString()}
          </div>
          <span className="text-muted-foreground">Credits</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          1 Credit = 1 EUR
        </p>
      </CardContent>
    </Card>
  );
};
