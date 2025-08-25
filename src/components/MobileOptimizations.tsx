import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Menu, 
  Search, 
  ShoppingCart, 
  User, 
  Heart, 
  Filter, 
  Grid, 
  List,
  ArrowUp,
  Phone,
  MessageCircle
} from "lucide-react";

interface MobileOptimizationsProps {
  children?: React.ReactNode;
  cartItemCount?: number;
  favoriteCount?: number;
}

export function MobileOptimizations({ 
  children, 
  cartItemCount = 0, 
  favoriteCount = 0 
}: MobileOptimizationsProps) {
  const isMobile = useIsMobile();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Show scroll to top button when scrolled down
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          {/* Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Button variant="ghost" className="w-full justify-start">
                  <Search className="h-4 w-4 mr-2" />
                  Search Products
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Grid className="h-4 w-4 mr-2" />
                  Categories
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Heart className="h-4 w-4 mr-2" />
                  Cart ({cartItemCount})
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo/Title */}
          <h1 className="font-bold text-lg">Marketplace</h1>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="p-4 border-b bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm"
          />
        </div>
      </div>

      {/* Filter and View Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filter Products</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Price Range</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    placeholder="Min" 
                    className="px-3 py-2 border rounded text-sm"
                  />
                  <input 
                    placeholder="Max" 
                    className="px-3 py-2 border rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Category</h3>
                <div className="space-y-2">
                  {['Electronics', 'Clothing', 'Books', 'Sports'].map((category) => (
                    <label key={category} className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full">Apply Filters</Button>
            </div>
          </DrawerContent>
        </Drawer>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-40">
        <div className="grid grid-cols-5 gap-1 p-2">
          <Button variant="ghost" className="flex flex-col gap-1 h-auto p-2">
            <Grid className="h-4 w-4" />
            <span className="text-xs">Home</span>
          </Button>
          
          <Button variant="ghost" className="flex flex-col gap-1 h-auto p-2">
            <Search className="h-4 w-4" />
            <span className="text-xs">Search</span>
          </Button>
          
          <Button variant="ghost" className="flex flex-col gap-1 h-auto p-2 relative">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-xs">Cart</span>
            {cartItemCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>
          
          <Button variant="ghost" className="flex flex-col gap-1 h-auto p-2">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">Chat</span>
          </Button>
          
          <Button variant="ghost" className="flex flex-col gap-1 h-auto p-2">
            <User className="h-4 w-4" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </nav>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-2">
        {showScrollTop && (
          <Button
            size="sm"
            onClick={scrollToTop}
            className="rounded-full w-12 h-12 shadow-lg"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          size="sm"
          className="rounded-full w-12 h-12 shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Phone className="h-4 w-4" />
        </Button>
      </div>

      {/* Swipe Gestures Indicator */}
      <div className="fixed top-1/2 left-2 transform -translate-y-1/2 text-muted-foreground/50">
        <div className="writing-mode-vertical text-xs">Swipe →</div>
      </div>
    </div>
  );
}

// Hook for detecting touch gestures
export function useTouchGestures() {
  const [isSwipeGesture, setIsSwipeGesture] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      
      // Check if it's a horizontal swipe (more horizontal than vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        setIsSwipeGesture(true);
        setSwipeDirection(deltaX > 0 ? 'right' : 'left');
        
        // Reset after animation
        setTimeout(() => {
          setIsSwipeGesture(false);
          setSwipeDirection(null);
        }, 300);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return { isSwipeGesture, swipeDirection };
}

// Component for swipe-enabled product cards
export function SwipeableProductCard({ children }: { children: React.ReactNode }) {
  const { isSwipeGesture, swipeDirection } = useTouchGestures();

  return (
    <div 
      className={`transition-transform duration-300 ${
        isSwipeGesture 
          ? swipeDirection === 'right' 
            ? 'transform translate-x-2' 
            : 'transform -translate-x-2'
          : ''
      }`}
    >
      {children}
    </div>
  );
}