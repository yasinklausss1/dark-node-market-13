import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { WalletBalance } from "@/components/WalletBalance";
import { DepositRequest } from "@/components/DepositRequest";
import { TransactionHistory } from "@/components/TransactionHistory";
import WithdrawalModal from "@/components/WithdrawalModal";
import WithdrawalHistory from "@/components/WithdrawalHistory";
import { WalletTestPanel } from "@/components/WalletTestPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";

export default function Wallet() {
  const navigate = useNavigate();
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBalanceChange = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8 max-w-full overflow-hidden">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/marketplace')}
              className="flex items-center gap-1 sm:gap-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Zurück</span>
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Wallet</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base px-2">
            Verwalte dein Guthaben, zahle ein und hebe Kryptowährungen ab
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          <div className="space-y-4 sm:space-y-6">
            <WalletTestPanel onBalanceChange={handleBalanceChange} />
            <WalletBalance key={refreshKey} />
            <DepositRequest />
            <div className="flex gap-3">
              <Button 
                onClick={() => setWithdrawalModalOpen(true)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Krypto abheben
              </Button>
            </div>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            <TransactionHistory />
            <WithdrawalHistory key={refreshKey} />
          </div>
        </div>
      </div>

      <WithdrawalModal
        open={withdrawalModalOpen}
        onOpenChange={setWithdrawalModalOpen}
        onWithdrawalSuccess={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
}