import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, Wallet, Settings, ShoppingBag, MessageCircle, LayoutDashboard, Shield, Gift } from 'lucide-react';
import { useState } from 'react';

export const Header = () => {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/marketplace" className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold font-cinzel bg-gradient-logo bg-clip-text text-transparent">
            Oracle Market
          </h1>
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="flex flex-col gap-4 mt-8">
              {!user ? (
                <>
                  <Link to="/auth?tab=signin" onClick={() => setOpen(false)}>
                    <Button className="w-full" variant="default">
                      Login
                    </Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setOpen(false)}>
                    <Button className="w-full" variant="outline">
                      Sign Up
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <div className="pb-4 border-b">
                    <p className="text-sm text-muted-foreground">Logged in as</p>
                    <p className="font-semibold">{profile?.username}</p>
                    {profile?.role && (
                      <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                    )}
                  </div>

                  <Link to="/wallet" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Wallet className="mr-2 h-4 w-4" />
                      Wallet
                    </Button>
                  </Link>

                  <Link to="/orders" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Orders
                    </Button>
                  </Link>

                  <Link to="/messages" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Messages
                    </Button>
                  </Link>

                  <Link to="/referral" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Gift className="mr-2 h-4 w-4" />
                      Referral Program
                    </Button>
                  </Link>

                  {profile?.role === 'seller' && (
                    <Link to="/seller" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Seller Dashboard
                      </Button>
                    </Link>
                  )}

                  {profile?.role === 'admin' && (
                    <Link to="/admin" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Button>
                    </Link>
                  )}

                  <Link to="/settings" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </Link>

                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
