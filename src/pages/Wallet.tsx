import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { CreditBalance } from "@/components/CreditBalance";
import { CreditPurchase } from "@/components/CreditPurchase";
import { CreditTransactionHistory } from "@/components/CreditTransactionHistory";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { WalletSkeleton } from "@/components/skeletons/WalletSkeleton";

export default function Wallet() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <WalletSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground mt-2">
          Manage your credits and purchase more
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <CreditBalance />
          <CreditPurchase />
        </div>
        
        <div className="space-y-6">
          <CreditTransactionHistory />
        </div>
      </div>
    </div>
  );
}