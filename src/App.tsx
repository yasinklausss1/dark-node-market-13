
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./components/PageTransition";
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

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/invite/:username" element={<PageTransition><InviteRedirect /></PageTransition>} />
        <Route path="/marketplace" element={<PageTransition><Marketplace /></PageTransition>} />
        <Route path="/messages" element={<PageTransition><Messages /></PageTransition>} />
        <Route path="/referral" element={<PageTransition><ReferralProgram /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminPanel /></PageTransition>} />
        <Route path="/seller" element={<PageTransition><SellerDashboard /></PageTransition>} />
        <Route path="/wallet" element={<PageTransition><Wallet /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/orders" element={<PageTransition><Orders /></PageTransition>} />
        <Route path="/legal/imprint" element={<PageTransition><Imprint /></PageTransition>} />
        <Route path="/legal/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="/legal/terms" element={<PageTransition><Terms /></PageTransition>} />
        <Route path="/legal/buyer-seller-terms" element={<PageTransition><BuyerSellerTerms /></PageTransition>} />
        <Route path="/legal/withdrawal" element={<PageTransition><Withdrawal /></PageTransition>} />
        <Route path="/legal/disclaimer" element={<PageTransition><Disclaimer /></PageTransition>} />
        <Route path="/legal/age-verification" element={<PageTransition><AgeVerification /></PageTransition>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

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
                  <AnimatedRoutes />
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
