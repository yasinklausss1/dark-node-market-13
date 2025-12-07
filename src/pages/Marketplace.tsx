import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, LogOut, Bitcoin, Wallet, Settings, Users, Star, Share2, Menu, ShoppingBag, MessageCircle } from 'lucide-react';
import ProductModal from '@/components/ProductModal';
import ShoppingCart from '@/components/ShoppingCart';
import SellerProfileModal from '@/components/SellerProfileModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCart } from '@/hooks/useCart';
import NewsPanel from '@/components/NewsPanel';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { ModernHeroSection } from '@/components/ModernHeroSection';
import { ProductCard } from '@/components/ProductCard';
import { ChatModal } from '@/components/ChatModal';

import { ConversationsModal } from '@/components/ConversationsModal';
import { useChat } from '@/hooks/useChat';
import { usePagination } from '@/hooks/usePagination';
import { useIsMobile } from '@/hooks/use-mobile';

import { Product } from '@/types/Product';

const Marketplace = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{[key: string]: number}>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [btcPrices, setBtcPrices] = useState<{[key: string]: number}>({});
  const [ltcPrices, setLtcPrices] = useState<{[key: string]: number}>({});
  const { btcPrice: currentBtcPrice, ltcPrice: currentLtcPrice } = useCryptoPrices();
  const [userCount, setUserCount] = useState(0);
  const [sellerProfileOpen, setSellerProfileOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedSellerUsername, setSelectedSellerUsername] = useState('');
  const [sellerRatings, setSellerRatings] = useState<Record<string, { average: number; total: number }>>({});
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart, getCartItemCount } = useCart();
  
  // New state for modals
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedChatProduct, setSelectedChatProduct] = useState<Product | null>(null);
  const [conversationsModalOpen, setConversationsModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  
  // Chat functionality
  const { conversations, fetchConversations } = useChat();
  
  // Track user presence
  useUserPresence();
  
  
  // Mobile detection and pagination
  const isMobile = useIsMobile();
  const { 
    currentItems, 
    currentPage, 
    totalPages, 
    goToPage, 
    nextPage, 
    prevPage, 
    hasNextPage, 
    hasPrevPage 
  } = usePagination({
    items: filteredProducts,
    itemsPerPageMobile: 18, // 3x6 grid
    itemsPerPageDesktop: 36, // 6x6 grid on desktop
    isMobile
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories(); 
    fetchUserCount();
    
    // Set up real-time listener for user count
    const channel = supabase
      .channel('user-count-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' }, 
        () => {
          fetchUserCount();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  // Handle URL product parameter to open modal directly
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) {
        openProductModal(product);
      } else {
        // Product not found - show error message
        toast({
          title: "Produkt nicht gefunden",
          description: "Das gesuchte Produkt existiert nicht mehr oder wurde entfernt.",
          variant: "destructive",
        });
      }
      
      // Remove the product parameter from URL without affecting browser history
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('product');
      const newUrl = newSearchParams.toString() 
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [products, searchParams, toast]);

  useEffect(() => {
    // Recalculate BTC prices when currentBtcPrice changes
    if (currentBtcPrice && products.length > 0) {
      const prices: {[key: string]: number} = {};
      products.forEach(product => {
        prices[product.id] = product.price / currentBtcPrice;
      });
      setBtcPrices(prices);
    }
  }, [currentBtcPrice, products]);

  useEffect(() => {
    // Recalculate LTC prices when currentLtcPrice changes
    if (currentLtcPrice && products.length > 0) {
      const prices: {[key: string]: number} = {};
      products.forEach(product => {
        prices[product.id] = product.price / currentLtcPrice;
      });
      setLtcPrices(prices);
    }
  }, [currentLtcPrice, products]);

  useEffect(() => {
    filterProducts();
    calculateCategoryCounts();
  }, [products, searchTerm, selectedCategory, sortBy]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const fetchUserCount = async () => {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error fetching user count:', error);
      return;
    }

    setUserCount(count || 0);
  };

  const fetchSellerRatings = async (sellerIds: string[]) => {
    if (!sellerIds || sellerIds.length === 0) return;
    const { data, error } = await supabase
      .from('seller_ratings')
      .select('seller_id, average_rating, total_reviews')
      .in('seller_id', sellerIds);
    if (error) {
      console.error('Error fetching seller ratings:', error);
      return;
    }
    const map: Record<string, { average: number; total: number }> = {};
    (data || []).forEach((r: any) => {
      map[r.seller_id] = { average: Number(r.average_rating), total: r.total_reviews };
    });
    setSellerRatings(map);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Products could not be loaded.",
        variant: "destructive"
      });
      return;
    }

    setProducts(data || []);
    const sellerIds = Array.from(new Set((data || []).map((p: any) => p.seller_id)));
    if (sellerIds.length) {
      fetchSellerRatings(sellerIds);
    }
    // Calculate BTC prices for all products
    if (currentBtcPrice && data) {
      const btcPricesMap: {[key: string]: number} = {};
      data.forEach(product => {
        btcPricesMap[product.id] = product.price / currentBtcPrice;
      });
      setBtcPrices(btcPricesMap);
    }
    
    // Calculate LTC prices for all products
    if (currentLtcPrice && data) {
      const ltcPricesMap: {[key: string]: number} = {};
      data.forEach(product => {
        ltcPricesMap[product.id] = product.price / currentLtcPrice;
      });
      setLtcPrices(ltcPricesMap);
    }
  };

  const calculateCategoryCounts = () => {
    const counts: {[key: string]: number} = { all: products.length };
    
    products.forEach(product => {
      counts[product.category] = (counts[product.category] || 0) + 1;
    });
    
    setCategoryCounts(counts);
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-asc':
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      default:
        filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredProducts(filtered);
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleAddToCart = (product: Product) => {
    // Check if user is trying to buy their own product
    if (user && product.seller_id === user.id) {
      toast({
        title: "Cannot Add to Cart",
        description: "You cannot purchase your own product.",
        variant: "destructive"
      });
      return;
    }

    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image_url: product.image_url,
      category: product.category
    });
    
    toast({
      title: "Added to Cart",
      description: `${product.title} has been added to your cart.`
    });
  };

  const handleViewSellerProfile = async (sellerId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', sellerId)
        .single();
      
      if (error) throw error;
      
      setSelectedSellerId(sellerId);
      setSelectedSellerUsername(data?.username || 'Unknown');
      setSellerProfileOpen(true);
    } catch (error) {
      console.error('Error fetching seller info:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
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
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-3xl font-bold font-cinzel">Oracle Market</h1>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCartOpen(true)}
                className="relative shrink-0"
              >
                Cart ({getCartItemCount()})
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleSignOut} className="shrink-0">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Sign Out</span>
              </Button>
            </div>
          </div>
          
          {/* Second row for user info and navigation on mobile */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground truncate">
              {profile?.username} ({profile?.role})
            </span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs px-2">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/orders')}>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/wallet')}>
                  <Wallet className="h-4 w-4 mr-2" />
                  Wallet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConversationsModalOpen(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Conversations
                </DropdownMenuItem>
                {profile?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                {(profile?.role === 'seller' || profile?.role === 'admin') && (
                  <DropdownMenuItem onClick={() => window.location.href = '/seller'}>
                    <Users className="h-4 w-4 mr-2" />
                    Seller Dashboard
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
        <div className="mb-6">
          <NewsPanel />
        </div>

        {/* Modern Hero Section */}
        <ModernHeroSection 
          userCount={userCount} 
          onScrollToProducts={() => {
            const element = document.getElementById('products-grid');
            element?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Search and Filter */}
        <div className="mb-6 md:mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Categories ({categoryCounts.all || 0})
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name} ({categoryCounts[category.name] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid with Modern Cards */}
        <div id="products-grid" className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-6">
          {currentItems.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              sellerRating={sellerRatings[product.seller_id]}
              onProductClick={openProductModal}
              onAddToCart={handleAddToCart}
              onViewSeller={handleViewSellerProfile}
              onStartChat={(prod) => {
                setSelectedChatProduct(prod);
                setChatModalOpen(true);
              }}
              isOwner={user?.id === product.seller_id}
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={!hasPrevPage}
            >
              Previous
            </Button>
            
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  className="w-10"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={!hasNextPage}
            >
              Next
            </Button>
          </div>
        )}

        {/* No Products Message */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 col-span-full">
            <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try different search terms or filters.'
                : 'No products are currently available.'}
            </p>
          </div>
        )}

      </main>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onStartChat={(product) => {
          setSelectedChatProduct(product);
          setChatModalOpen(true);
          setModalOpen(false); // Close product modal when opening chat
        }}
      />

      {/* Shopping Cart */}
      <ShoppingCart
        open={cartOpen}
        onOpenChange={setCartOpen}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />

      {/* Seller Profile Modal */}
      <SellerProfileModal
        open={sellerProfileOpen}
        onOpenChange={setSellerProfileOpen}
        sellerId={selectedSellerId}
        sellerUsername={selectedSellerUsername}
      />

      {/* Chat Modal */}
      <ChatModal
        open={chatModalOpen}
        onOpenChange={(open) => {
          setChatModalOpen(open);
          if (!open) {
            setSelectedConversation(null);
            setSelectedChatProduct(null);
          }
        }}
        productId={selectedConversation?.product_id || selectedChatProduct?.id}
        sellerId={selectedConversation?.seller_id || selectedChatProduct?.seller_id}
        productTitle={selectedConversation?.product_title || selectedChatProduct?.title}
        sellerUsername={
          selectedConversation?.other_user_username || selectedSellerUsername
        }
        conversationId={selectedConversation?.id}
        conversationStatus={selectedConversation?.status}
        onBackToConversations={selectedConversation ? () => {
          setChatModalOpen(false);
          setConversationsModalOpen(true);
        } : undefined}
      />


      {/* Conversations Modal */}
      <ConversationsModal
        open={conversationsModalOpen}
        onOpenChange={setConversationsModalOpen}
        onSelectConversation={(conversation) => {
          setSelectedConversation(conversation);
          setConversationsModalOpen(false);
          setChatModalOpen(true);
        }}
      />
    </div>
  );
};

export default Marketplace;