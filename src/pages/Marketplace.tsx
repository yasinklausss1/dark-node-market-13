import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, LogOut, Wallet, Settings, Users, Menu, ShoppingBag, MessageCircle, Package, Download, Flag, LayoutGrid, LayoutList, MessagesSquare } from 'lucide-react';
import ProductModal from '@/components/ProductModal';
import ShoppingCart from '@/components/ShoppingCart';
import SellerProfileModal from '@/components/SellerProfileModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useCart } from '@/hooks/useCart';
import NewsPanel from '@/components/NewsPanel';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { ModernHeroSection } from '@/components/ModernHeroSection';
import { EscrowTrustBanner } from '@/components/EscrowTrustBanner';
import { ProductCard } from '@/components/ProductCard';
import { ChatModal } from '@/components/ChatModal';
import { OracleLogo } from '@/components/OracleLogo';
import { ForumInline } from '@/components/forum/ForumInline';

import { ConversationsModal } from '@/components/ConversationsModal';
import { useChat } from '@/hooks/useChat';
import { usePagination } from '@/hooks/usePagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { useUserRole } from '@/hooks/useUserRole';

import { Product } from '@/types/Product';

const Marketplace = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { isModeratorOrAdmin } = useUserRole();
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
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
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
  const [productTypeTab, setProductTypeTab] = useState<'physical' | 'digital' | 'forum'>('physical');
  const [mobileGridCols, setMobileGridCols] = useState<1 | 2>(2);
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart, getCartItemCount } = useCart();
  
  // New state for modals
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedChatProduct, setSelectedChatProduct] = useState<Product | null>(null);
  const [conversationsModalOpen, setConversationsModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  
  // New orders notification for sellers
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  
  // Buyer notifications
  const [orderUpdatesCount, setOrderUpdatesCount] = useState(0);
  const [newReportMessagesCount, setNewReportMessagesCount] = useState(0);
  
  // Chat functionality
  const { conversations, fetchConversations } = useChat();
  
  // Track user presence
  useUserPresence();
  
  // Track visitor with user association
  useVisitorTracking('/marketplace');
  
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
    itemsPerPageMobile: 18,
    itemsPerPageDesktop: 36,
    isMobile
  });

  // Fetch new orders count for sellers
  const fetchNewOrdersCount = async () => {
    if (!user || (profile?.role !== 'seller' && profile?.role !== 'admin')) return;
    
    try {
      // Get orders for seller's products that are pending or confirmed (not yet processed)
      const { data: sellerProducts } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user.id);
      
      if (!sellerProducts || sellerProducts.length === 0) {
        setNewOrdersCount(0);
        return;
      }
      
      const productIds = sellerProducts.map(p => p.id);
      
      const { count, error } = await supabase
        .from('order_items')
        .select('order_id, orders!inner(status, order_status)', { count: 'exact', head: true })
        .in('product_id', productIds)
        .or('order_status.eq.confirmed,order_status.eq.pending', { referencedTable: 'orders' });
      
      if (error) {
        console.error('Error fetching new orders count:', error);
        return;
      }
      
      setNewOrdersCount(count || 0);
    } catch (error) {
      console.error('Error fetching new orders:', error);
    }
  };

  // Fetch order updates count for buyers (orders with recent status changes)
  const fetchOrderUpdatesCount = async () => {
    if (!user) return;
    
    try {
      // Get last seen timestamp from localStorage
      const lastSeenOrdersKey = `lastSeenOrders_${user.id}`;
      const lastSeen = localStorage.getItem(lastSeenOrdersKey);
      const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(0);
      
      // Count orders updated after last seen
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('status_updated_at', lastSeenDate.toISOString())
        .in('order_status', ['processing', 'shipped', 'delivered']);
      
      if (error) {
        console.error('Error fetching order updates:', error);
        return;
      }
      
      setOrderUpdatesCount(count || 0);
    } catch (error) {
      console.error('Error fetching order updates:', error);
    }
  };

  // Fetch new report messages count
  const fetchNewReportMessagesCount = async () => {
    if (!user) return;
    
    try {
      // Get last seen timestamp from localStorage
      const lastSeenReportsKey = `lastSeenReports_${user.id}`;
      const lastSeen = localStorage.getItem(lastSeenReportsKey);
      const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(0);
      
      // Get user's reports
      const { data: reports, error: reportsError } = await supabase
        .from('seller_reports')
        .select('id')
        .eq('reporter_id', user.id);
      
      if (reportsError || !reports || reports.length === 0) {
        setNewReportMessagesCount(0);
        return;
      }
      
      const reportIds = reports.map(r => r.id);
      
      // Count new admin messages
      const { count, error } = await supabase
        .from('report_messages')
        .select('*', { count: 'exact', head: true })
        .in('report_id', reportIds)
        .eq('is_admin', true)
        .gt('created_at', lastSeenDate.toISOString());
      
      if (error) {
        console.error('Error fetching report messages:', error);
        return;
      }
      
      setNewReportMessagesCount(count || 0);
    } catch (error) {
      console.error('Error fetching report messages:', error);
    }
  };

  useEffect(() => {
    fetchNewOrdersCount();
    fetchOrderUpdatesCount();
    fetchNewReportMessagesCount();
    
    // Subscribe to order changes for real-time updates
    const channel = supabase
      .channel('seller-orders-notification')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        () => {
          fetchNewOrdersCount();
          fetchOrderUpdatesCount();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchNewOrdersCount();
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'report_messages' },
        () => {
          fetchNewReportMessagesCount();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  useEffect(() => {
    fetchProducts();
    fetchCategories(); 
    fetchUserCount();
    
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

  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) {
        openProductModal(product);
      } else {
        toast({
          title: "Produkt nicht gefunden",
          description: "Das gesuchte Produkt existiert nicht mehr oder wurde entfernt.",
          variant: "destructive",
        });
      }
      
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('product');
      const newUrl = newSearchParams.toString() 
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [products, searchParams, toast]);

  useEffect(() => {
    if (currentBtcPrice && products.length > 0) {
      const prices: {[key: string]: number} = {};
      products.forEach(product => {
        prices[product.id] = product.price / currentBtcPrice;
      });
      setBtcPrices(prices);
    }
  }, [currentBtcPrice, products]);

  useEffect(() => {
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
  }, [products, searchTerm, selectedCategory, selectedSubcategory, sortBy, productTypeTab]);

  // Reset category and subcategory when switching product type tab
  useEffect(() => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
  }, [productTypeTab]);

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory('all');
  }, [selectedCategory]);

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

    // Also fetch subcategories
    const { data: subData, error: subError } = await supabase
      .from('subcategories')
      .select('*')
      .order('name');
    
    if (subError) {
      console.error('Error fetching subcategories:', subError);
      return;
    }

    setSubcategories(subData || []);
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
      .select('*, subcategories(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Fehler",
        description: "Produkte konnten nicht geladen werden.",
        variant: "destructive"
      });
      return;
    }

    // Map subcategory names to products
    const productsWithSubcategory = (data || []).map((p: any) => ({
      ...p,
      subcategory_name: p.subcategories?.name || null
    }));

    setProducts(productsWithSubcategory);
    const sellerIds = Array.from(new Set((productsWithSubcategory || []).map((p: any) => p.seller_id)));
    if (sellerIds.length) {
      fetchSellerRatings(sellerIds);
    }
    if (currentBtcPrice && productsWithSubcategory) {
      const btcPricesMap: {[key: string]: number} = {};
      productsWithSubcategory.forEach(product => {
        btcPricesMap[product.id] = product.price / currentBtcPrice;
      });
      setBtcPrices(btcPricesMap);
    }
    
    if (currentLtcPrice && productsWithSubcategory) {
      const ltcPricesMap: {[key: string]: number} = {};
      productsWithSubcategory.forEach(product => {
        ltcPricesMap[product.id] = product.price / currentLtcPrice;
      });
      setLtcPrices(ltcPricesMap);
    }
  };

  const calculateCategoryCounts = () => {
    // Filter products by current product type tab first
    const filteredByType = products.filter(product => 
      (product.product_type || 'physical') === productTypeTab
    );
    
    const counts: {[key: string]: number} = { all: filteredByType.length };
    
    filteredByType.forEach(product => {
      counts[product.category] = (counts[product.category] || 0) + 1;
    });
    
    setCategoryCounts(counts);
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by product type
    filtered = filtered.filter(product => 
      (product.product_type || 'physical') === productTypeTab
    );

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category or subcategory
    if (selectedCategory !== 'all') {
      if (selectedCategory.startsWith('sub:')) {
        // Subcategory selected
        const subId = selectedCategory.replace('sub:', '');
        filtered = filtered.filter(product => product.subcategory_id === subId);
      } else if (selectedCategory.startsWith('cat:')) {
        // Main category selected
        const catName = selectedCategory.replace('cat:', '');
        filtered = filtered.filter(product => product.category === catName);
      } else {
        // Legacy support for direct category name
        filtered = filtered.filter(product => product.category === selectedCategory);
      }
    }

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

  const getSelectedCategoryId = () => {
    const category = categories.find(c => c.name === selectedCategory);
    return category?.id || '';
  };

  const getSubcategoriesForSelectedCategory = () => {
    if (selectedCategory === 'all') return [];
    return subcategories.filter(s => s.category_id === getSelectedCategoryId());
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleAddToCart = (product: Product) => {
    if (user && product.seller_id === user.id) {
      toast({
        title: "Nicht möglich",
        description: "Du kannst dein eigenes Produkt nicht kaufen.",
        variant: "destructive"
      });
      return;
    }

    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image_url: product.image_url,
      category: product.category,
      product_type: product.product_type
    });
    
    toast({
      title: "Zum Warenkorb hinzugefügt",
      description: `${product.title} wurde zum Warenkorb hinzugefügt.`
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
      setSelectedSellerUsername(data?.username || 'Unbekannt');
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
      <header className="border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <OracleLogo size="sm" className="cursor-pointer" />
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCartOpen(true)}
                className="relative shrink-0 h-9"
              >
                <ShoppingBag className="h-4 w-4 mr-1" />
                <span>{getCartItemCount()}</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-3">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                    {profile?.username}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Einstellungen
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      // Mark reports as seen
                      if (user) {
                        localStorage.setItem(`lastSeenReports_${user.id}`, new Date().toISOString());
                        setNewReportMessagesCount(0);
                      }
                      navigate('/reports');
                    }} 
                    className="relative"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Meine Meldungen
                    {newReportMessagesCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
                        {newReportMessagesCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      // Mark orders as seen
                      if (user) {
                        localStorage.setItem(`lastSeenOrders_${user.id}`, new Date().toISOString());
                        setOrderUpdatesCount(0);
                      }
                      navigate('/orders');
                    }} 
                    className="relative"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Bestellungen
                    {orderUpdatesCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
                        {orderUpdatesCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/wallet')}>
                    <Wallet className="h-4 w-4 mr-2" />
                    Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConversationsModalOpen(true)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Nachrichten
                  </DropdownMenuItem>
                  {isModeratorOrAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Settings className="h-4 w-4 mr-2" />
                      {profile?.role === 'admin' ? 'Admin Panel' : 'Moderator Panel'}
                    </DropdownMenuItem>
                  )}
                  {(profile?.role === 'seller' || profile?.role === 'admin') && (
                    <DropdownMenuItem onClick={() => navigate('/seller')} className="relative">
                      <Users className="h-4 w-4 mr-2" />
                      Verkäufer Dashboard
                      {newOrdersCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
                          {newOrdersCount}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-8">
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

        {/* Escrow Trust Banner */}
        <EscrowTrustBanner />

        {/* Feedback Notice */}
        <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Für Vorschläge, Verbesserungen oder Bugs bitte in der{" "}
            <a 
              href="https://t.me/+yXmX6a5jYN4wMmU0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Gruppe
            </a>
            {" "}melden oder privat schreiben:{" "}
            <a href="https://t.me/OracleMarketSupport" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">@OracleMarketSupport</a>
          </p>
        </div>

        {/* Product Type Tabs */}
        <div className="mb-8">
          <Tabs value={productTypeTab} onValueChange={(v) => setProductTypeTab(v as 'physical' | 'digital' | 'forum')} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg h-12">
              <TabsTrigger value="physical" className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" />
                <span>Produkte</span>
              </TabsTrigger>
              <TabsTrigger value="digital" className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4" />
                <span>Digital</span>
              </TabsTrigger>
              <TabsTrigger value="forum" className="flex items-center gap-2 text-sm">
                <MessagesSquare className="h-4 w-4" />
                <span>Forum</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Forum View */}
        {productTypeTab === 'forum' ? (
          <ForumInline />
        ) : (
          <>
            {/* Search and Filter */}
            <div className="mb-8 space-y-4">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Produkte suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Select value={selectedCategory} onValueChange={(value) => {
                    setSelectedCategory(value);
                    setSelectedSubcategory('all');
                  }}>
                    <SelectTrigger className="flex-1 min-w-[140px] h-11">
                      <SelectValue placeholder="Kategorie" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px] overflow-y-auto">
                      <SelectItem value="all">
                        Alle ({categoryCounts.all || 0})
                      </SelectItem>
                      {categories
                        .filter((category) => category.product_type === productTypeTab)
                        .map((category) => {
                          const categorySubs = subcategories.filter(s => s.category_id === category.id);
                          return (
                            <React.Fragment key={category.id}>
                              <SelectItem value={`cat:${category.name}`} className="font-medium">
                                {category.name} ({categoryCounts[category.name] || 0})
                              </SelectItem>
                              {categorySubs.map((sub) => (
                                <SelectItem key={sub.id} value={`sub:${sub.id}`} className="pl-6 text-muted-foreground">
                                  ↳ {sub.name}
                                </SelectItem>
                              ))}
                            </React.Fragment>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="flex-1 h-11">
                      <SelectValue placeholder="Sortieren" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Neueste</SelectItem>
                      <SelectItem value="price-asc">Preis ↑</SelectItem>
                      <SelectItem value="price-desc">Preis ↓</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Mobile Grid Toggle */}
                  <div className="flex md:hidden border border-border rounded-md overflow-hidden">
                    <Button
                      variant={mobileGridCols === 1 ? "default" : "ghost"}
                      size="icon"
                      className="h-11 w-11 rounded-none"
                      onClick={() => setMobileGridCols(1)}
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={mobileGridCols === 2 ? "default" : "ghost"}
                      size="icon"
                      className="h-11 w-11 rounded-none border-l border-border"
                      onClick={() => setMobileGridCols(2)}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid with Modern Cards */}
            <div id="products-grid" className={`grid ${mobileGridCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6`}>
              {currentItems.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  sellerRating={sellerRatings[product.seller_id]}
                  onProductClick={openProductModal}
                  onAddToCart={handleAddToCart}
                  onViewSeller={handleViewSellerProfile}
                  onStartChat={(p) => {
                    setSelectedChatProduct(p);
                    setChatModalOpen(true);
                  }}
                  isOwner={user?.id === product.seller_id}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Keine Produkte gefunden.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={!hasPrevPage}
                >
                  Zurück
                </Button>
                <span className="text-sm text-muted-foreground">
                  Seite {currentPage} von {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!hasNextPage}
                >
                  Weiter
                </Button>
              </div>
            )}
          </>
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
          setModalOpen(false);
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
        onProductClick={(productId) => {
          const product = products.find(p => p.id === productId);
          if (product) {
            openProductModal(product);
          }
        }}
      />

      {/* Conversations Modal */}
      <ConversationsModal
        open={conversationsModalOpen}
        onOpenChange={setConversationsModalOpen}
        onSelectConversation={(conversation) => {
          setSelectedConversation(conversation);
          setChatModalOpen(true);
          setConversationsModalOpen(false);
        }}
      />

      {/* Chat Modal */}
      {(selectedChatProduct || selectedConversation) && (
        <ChatModal
          open={chatModalOpen}
          onOpenChange={(open) => {
            setChatModalOpen(open);
            if (!open) {
              setSelectedChatProduct(null);
              setSelectedConversation(null);
            }
          }}
          productId={selectedChatProduct?.id || selectedConversation?.product_id}
          sellerId={selectedChatProduct?.seller_id || selectedConversation?.seller_id}
          productTitle={selectedChatProduct?.title || selectedConversation?.product_title}
          sellerUsername={selectedConversation?.other_user_username}
          conversationId={selectedConversation?.id}
          conversationStatus={selectedConversation?.status}
        />
      )}
    </div>
  );
};

export default Marketplace;