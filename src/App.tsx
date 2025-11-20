
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./hooks/useCart";
import CookieBanner from "./components/CookieBanner";
import AgeVerificationModal from "./components/AgeVerificationModal";
import Footer from "./components/Footer";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Marketplace from "./pages/Marketplace";
import AdminPanel from "./pages/AdminPanel";
import SellerDashboard from "./pages/SellerDashboard";
import Wallet from "./pages/Wallet";
import Settings from "./pages/Settings";
import Orders from "./pages/Orders";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import InviteRedirect from "./pages/InviteRedirect";
import ReferralProgram from "./pages/ReferralProgram";
import Imprint from "./pages/Legal/Imprint";
import Privacy from "./pages/Legal/Privacy";
import Terms from "./pages/Legal/Terms";
import BuyerSellerTerms from "./pages/Legal/BuyerSellerTerms";
import Withdrawal from "./pages/Legal/Withdrawal";
import Disclaimer from "./pages/Legal/Disclaimer";
import AgeVerification from "./pages/Legal/AgeVerification";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="flex flex-col min-h-screen">
                <AgeVerificationModal />
                <CookieBanner />
                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/invite/:username" element={<InviteRedirect />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/referral" element={<ReferralProgram />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/seller" element={<SellerDashboard />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/legal/imprint" element={<Imprint />} />
                    <Route path="/legal/privacy" element={<Privacy />} />
                    <Route path="/legal/terms" element={<Terms />} />
                    <Route path="/legal/buyer-seller-terms" element={<BuyerSellerTerms />} />
                    <Route path="/legal/withdrawal" element={<Withdrawal />} />
                    <Route path="/legal/disclaimer" element={<Disclaimer />} />
                    <Route path="/legal/age-verification" element={<AgeVerification />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
                <Footer />
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
