import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, ExternalLink, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

export const CreditPurchase = () => {
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async (amount: number) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('create-credit-purchase', {
        body: { creditsAmount: amount }
      });

      console.log('Full purchase response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to create payment');
      }

      // Handle the response data
      const responseData = data;
      console.log('Response data:', responseData);

      if (!responseData?.paymentUrl) {
        console.error('Invalid response structure:', responseData);
        throw new Error('No payment URL received from server');
      }

      // Open payment page
      const paymentUrl = responseData.paymentUrl;
      console.log('Opening payment URL:', paymentUrl);
      window.open(paymentUrl, '_blank');
      
      toast({
        title: "Payment initiated",
        description: `Opening payment page for ${amount} credits (€${amount})`,
      });
    } catch (error: any) {
      console.error('Error creating purchase:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSelectedAmount(null);
      setCustomAmount("");
    }
  };

  const handleCustomPurchase = () => {
    const amount = parseInt(customAmount);
    if (amount && amount > 0) {
      handlePurchase(amount);
    } else {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
    }
  };

  const testWebhook = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to test",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('test-credit-webhook', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        toast({
          title: "Error",
          description: response.error.message,
          variant: "destructive",
        });
        return;
      }

      const result = response.data;
      if (result.test_results.test_passed) {
        toast({
          title: "✅ Test passed!",
          description: `${result.test_results.credits_added} credits added. Balance: ${result.test_results.balance_before} → ${result.test_results.balance_after}`,
        });
      } else {
        toast({
          title: "Test completed with issues",
          description: `Expected ${result.test_results.credits_purchased} credits, got ${result.test_results.credits_added}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Test failed: " + error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Buy Credits
        </CardTitle>
        <CardDescription>
          Purchase credits to buy products. 1 Credit = 1 EUR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-3">Quick select:</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
                disabled={loading}
              >
                {amount} Credits
                <br />
                <span className="text-xs">€{amount}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Custom amount:</p>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              disabled={loading}
            />
            <Button
              onClick={handleCustomPurchase}
              disabled={loading || !customAmount}
              variant="secondary"
            >
              Buy
            </Button>
          </div>
        </div>

        {selectedAmount && (
          <Button
            onClick={() => handlePurchase(selectedAmount)}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                Pay €{selectedAmount} for {selectedAmount} Credits
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}

        <Button 
          onClick={testWebhook} 
          disabled={testing} 
          variant="outline" 
          className="w-full"
          size="sm"
        >
          <TestTube className="mr-2 h-4 w-4" />
          {testing ? "Testing..." : "Test Webhook (Dev)"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          You will be redirected to a secure payment page where you can pay with cryptocurrency
        </p>
      </CardContent>
    </Card>
  );
};
