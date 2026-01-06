import { useNavigate, Navigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { WalletBalance } from "@/components/WalletBalance";
import { CryptoDepositNew } from "@/components/CryptoDepositNew";
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
  const {
    user,
    loading
  } = useAuth();
  const {
    isAdmin,
    loading: roleLoading
  } = useUserRole();
  const isMobile = useIsMobile();
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
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-primary"></div>
      </div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  const WalletActions = () => <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3">
      <Button onClick={() => setWithdrawalModalOpen(true)} className="flex items-center justify-center gap-1.5 sm:gap-2 h-11 sm:h-10 text-xs sm:text-sm px-3 sm:px-4" size={isMobile ? "sm" : "default"}>
        <Download className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{isMobile ? "Abheben" : "Krypto abheben"}</span>
      </Button>
      
    </div>;
  const WalletContent = () => <div className="space-y-4 sm:space-y-6">
      {/* Main Balance Card - Full Width on Mobile */}
      <WalletBalance key={refreshKey} />
      
      {/* Actions */}
      <WalletActions />
      
      {/* Deposit Section - Neue eindeutige Adressen pro Einzahlung */}
      <CryptoDepositNew />
      
      {/* Admin Test Panel */}
      {isAdmin && <WalletTestPanel onBalanceChange={handleBalanceChange} />}
      
      {/* Transaction & Withdrawal History */}
      <div className="space-y-4 sm:space-y-6">
        <TransactionHistory />
        <WithdrawalHistory key={refreshKey} />
      </div>
    </div>;
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-4xl">
        {/* Mobile-Optimized Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/marketplace')} className="h-9 w-9 sm:h-10 sm:w-auto p-0 sm:px-3">
              <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">Zurück</span>
            </Button>
            <div className="flex items-center gap-2">
              <WalletIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Wallet</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base leading-relaxed">
            Verwalte dein Guthaben, zahle ein und hebe Kryptowährungen ab
          </p>
        </div>

        {/* Admin Tabs or Regular Wallet */}
        {isAdmin ? <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-11 sm:h-10">
              <TabsTrigger value="wallet" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <WalletIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="truncate">Mein Wallet</span>
              </TabsTrigger>
              <TabsTrigger value="fees" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="truncate">Gebühren</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wallet" className="mt-0">
              <WalletContent />
            </TabsContent>

            <TabsContent value="fees" className="mt-0">
              <AdminFeeWallet />
            </TabsContent>
          </Tabs> : <WalletContent />}
      </div>

      <WithdrawalModal open={withdrawalModalOpen} onOpenChange={setWithdrawalModalOpen} onWithdrawalSuccess={() => setRefreshKey(prev => prev + 1)} />

      <WalletImportModal open={importModalOpen} onOpenChange={setImportModalOpen} onSuccess={() => setRefreshKey(prev => prev + 1)} />
    </div>;
}