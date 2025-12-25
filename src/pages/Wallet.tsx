import { useNavigate, Navigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { WalletBalance } from "@/components/WalletBalance";
import { DepositRequest } from "@/components/DepositRequest";
import { TransactionHistory } from "@/components/TransactionHistory";
import WithdrawalModal from "@/components/WithdrawalModal";
import WithdrawalHistory from "@/components/WithdrawalHistory";
import { WalletTestPanel } from "@/components/WalletTestPanel";
import { WalletImportModal } from "@/components/WalletImportModal";
import { AdminFeeWallet } from "@/components/AdminFeeWallet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Upload, TrendingUp, Wallet as WalletIcon } from "lucide-react";

export default function Wallet() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("wallet");

  // Track visitor with user association
  useVisitorTracking('/wallet');

  const handleBalanceChange = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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

        {/* Admin gets tabs for regular wallet and fee wallet */}
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="wallet" className="flex items-center gap-2">
                <WalletIcon className="h-4 w-4" />
                Mein Wallet
              </TabsTrigger>
              <TabsTrigger value="fees" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Gebühren-Wallet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wallet">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                <div className="space-y-4 sm:space-y-6">
                  <WalletTestPanel onBalanceChange={handleBalanceChange} />
                  <WalletBalance key={refreshKey} />
                  <DepositRequest />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => setWithdrawalModalOpen(true)}
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      <Download className="h-4 w-4" />
                      Krypto abheben
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setImportModalOpen(true)}
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      <Upload className="h-4 w-4" />
                      Wallet importieren
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                  <TransactionHistory />
                  <WithdrawalHistory key={refreshKey} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fees">
              <AdminFeeWallet />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            <div className="space-y-4 sm:space-y-6">
              <WalletTestPanel onBalanceChange={handleBalanceChange} />
              <WalletBalance key={refreshKey} />
              <DepositRequest />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => setWithdrawalModalOpen(true)}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  Krypto abheben
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setImportModalOpen(true)}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4" />
                  Wallet importieren
                </Button>
              </div>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <TransactionHistory />
              <WithdrawalHistory key={refreshKey} />
            </div>
          </div>
        )}
      </div>

      <WithdrawalModal
        open={withdrawalModalOpen}
        onOpenChange={setWithdrawalModalOpen}
        onWithdrawalSuccess={() => setRefreshKey(prev => prev + 1)}
      />

      <WalletImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
}