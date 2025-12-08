import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Package, Truck, CheckCircle, ExternalLink, ArrowLeft, Download, FileText } from 'lucide-react';
import ReviewModal from '@/components/ReviewModal';
import SellerProfileModal from '@/components/SellerProfileModal';

interface Order {
  id: string;
  total_amount_eur: number;
  status: string;
  order_status: string;
  created_at: string;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_first_name: string | null;
  shipping_last_name: string | null;
  shipping_street: string | null;
  shipping_house_number: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
}

interface OrderWithSellers extends Order {
  sellers: Array<{
    seller_id: string;
    seller_username: string;
    has_review: boolean;
  }>;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_eur: number;
  product_title?: string;
  product_type?: string;
  digital_content?: string | null;
  digital_content_delivered_at?: string | null;
}

const Orders: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithSellers[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedSellerUsername, setSelectedSellerUsername] = useState('');
  const [sellerProfileOpen, setSellerProfileOpen] = useState(false);

  const fetchOrderItems = async (orderIds: string[]) => {
    if (orderIds.length === 0) {
      setItemsByOrder({});
      return;
    }
    
    console.log('Fetching order items for orders:', orderIds);
    
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products (
          title,
          product_type
        )
      `)
      .in('order_id', orderIds);
    
    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      throw itemsError;
    }
    
    console.log('Fetched order items:', itemsData);
    
    const grouped: Record<string, OrderItem[]> = {};
    (itemsData || []).forEach((it: any) => {
      if (!grouped[it.order_id]) grouped[it.order_id] = [];
      grouped[it.order_id].push({
        id: it.id,
        order_id: it.order_id,
        product_id: it.product_id,
        quantity: it.quantity,
        price_eur: Number(it.price_eur),
        product_title: it.products?.title || undefined,
        product_type: it.products?.product_type || undefined,
        digital_content: it.digital_content || null,
        digital_content_delivered_at: it.digital_content_delivered_at || null,
      });
    });
    
    console.log('Grouped items with digital content:', grouped);
    setItemsByOrder(grouped);
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;
        const ordersList = ordersData || [];

        const ordersWithSellers = await Promise.all(
          ordersList.map(async (order: any) => {
            const { data: orderItems } = await supabase
              .from('order_items')
              .select(`
                product_id,
                products!inner(seller_id, profiles!inner(username))
              `)
              .eq('order_id', order.id);

            const sellers = orderItems?.map((item: any) => ({
              seller_id: item.products.seller_id,
              seller_username: item.products.profiles.username,
              has_review: false
            })) || [];

            if (sellers.length > 0) {
              const { data: reviews } = await supabase
                .from('reviews')
                .select('seller_id')
                .eq('order_id', order.id)
                .eq('reviewer_id', user.id);

              const reviewedSellerIds = new Set(reviews?.map(r => r.seller_id) || []);
              sellers.forEach(seller => {
                seller.has_review = reviewedSellerIds.has(seller.seller_id);
              });
            }

            return {
              ...order,
              sellers: sellers.filter((seller, index, self) => 
                index === self.findIndex(s => s.seller_id === seller.seller_id)
              )
            };
          })
        );

        setOrders(ordersWithSellers as any);
        
        const orderIds = ordersList.map((o: any) => o.id);
        await fetchOrderItems(orderIds);
      } catch (e) {
        console.error('Fehler beim Laden der Bestellungen:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Real-time subscription for order_items updates (when seller delivers digital content)
  useEffect(() => {
    if (!user || orders.length === 0) return;

    const orderIds = orders.map(o => o.id);
    console.log('Setting up realtime subscription for orders:', orderIds);

    const channel = supabase
      .channel('order-items-updates-' + user.id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items'
        },
        async (payload) => {
          console.log('Received realtime update:', payload);
          const updatedItem = payload.new as any;
          
          // Check if this update is for one of the user's orders
          if (orderIds.includes(updatedItem.order_id)) {
            console.log('Update is for user order, refreshing items...');
            await fetchOrderItems(orderIds);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, orders]);

  const handleReviewSeller = (orderId: string, sellerId: string, sellerUsername: string) => {
    setSelectedOrderId(orderId);
    setSelectedSellerId(sellerId);
    setSelectedSellerUsername(sellerUsername);
    setReviewModalOpen(true);
  };

  const handleViewSellerProfile = (sellerId: string, sellerUsername: string) => {
    setSelectedSellerId(sellerId);
    setSelectedSellerUsername(sellerUsername);
    setSellerProfileOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'shipped':
        return <Truck className="h-4 w-4 text-orange-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ausstehend';
      case 'confirmed':
        return 'Bestätigt';
      case 'processing':
        return 'In Bearbeitung';
      case 'shipped':
        return 'Versendet';
      case 'delivered':
        return 'Geliefert';
      case 'cancelled':
        return 'Storniert';
      default:
        return status;
    }
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
    <div className="min-h-screen bg-background p-3 sm:p-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-3xl font-bold font-cinzel">Meine Bestellungen</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Zurück zum Marktplatz</span>
            <span className="sm:hidden">Zurück</span>
          </Button>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Bestellverlauf ({orders.length})</CardTitle>
            <CardDescription className="text-sm">Zeige deine vergangenen Einkäufe und deren Status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Bestellungen werden geladen...</p>
            ) : orders.length === 0 ? (
              <p className="text-muted-foreground">Du hast noch keine Bestellungen aufgegeben.</p>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">Bestellung #{order.id.slice(0,8)}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString('de-DE')}</p>
                      </div>
                      <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end gap-2">
                        <p className="text-base sm:text-lg font-bold text-primary">€{Number(order.total_amount_eur).toFixed(2)}</p>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.order_status)}
                          <Badge className={`${getStatusColor(order.order_status)} text-xs`}>
                            {getStatusLabel(order.order_status)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {order.tracking_number && (
                      <div className="mb-3 p-3 bg-muted rounded">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Sendungsnummer: {order.tracking_number}</p>
                            <p className="text-xs text-muted-foreground">Verfolge dein Paket</p>
                          </div>
                          {order.tracking_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a 
                                href={order.tracking_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Verfolgen
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <h4 className="font-medium text-sm">Artikel</h4>
                        <ul className="text-xs sm:text-sm text-muted-foreground list-disc pl-5">
                          {(itemsByOrder[order.id] || []).map((it) => (
                            <li key={it.id} className="break-words">
                              {it.quantity}x {it.product_title || `Produkt ${it.product_id.slice(0,8)}`} (€{it.price_eur.toFixed(2)})
                              {it.product_type === 'digital' && (
                                <Badge variant="secondary" className="ml-2 text-xs">Digital</Badge>
                              )}
                            </li>
                          ))}
                        </ul>

                        {/* Digital Content Section - Show for confirmed/delivered orders */}
                        {['confirmed', 'processing', 'shipped', 'delivered'].includes(order.order_status || order.status) && (
                          (() => {
                            const digitalItems = (itemsByOrder[order.id] || []).filter(
                              it => it.product_type === 'digital'
                            );
                            if (digitalItems.length === 0) return null;
                            
                            // Check if any digital item has content delivered
                            const hasDeliveredContent = digitalItems.some(it => it.digital_content);
                            const hasWaitingContent = digitalItems.some(it => !it.digital_content);
                            
                            return (
                              <div className="mt-4 space-y-3">
                                {/* Delivered content */}
                                {hasDeliveredContent && (
                                  <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Download className="h-4 w-4 text-green-600" />
                                      <h4 className="font-medium text-sm text-green-800 dark:text-green-200">
                                        Digitale Inhalte erhalten
                                      </h4>
                                    </div>
                                    <div className="space-y-3">
                                      {digitalItems.filter(it => it.digital_content).map((item) => (
                                        <div key={item.id} className="bg-white dark:bg-background p-3 rounded border">
                                          <p className="text-xs font-medium text-muted-foreground mb-1">
                                            {item.product_title}:
                                          </p>
                                          <pre className="text-sm whitespace-pre-wrap break-all bg-muted p-2 rounded font-mono">
                                            {item.digital_content}
                                          </pre>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Waiting for seller */}
                                {hasWaitingContent && (
                                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-yellow-600" />
                                      <h4 className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                                        Warte auf Verkäufer
                                      </h4>
                                    </div>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                      Der Verkäufer bereitet die digitalen Daten für folgende Produkte vor:
                                    </p>
                                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 list-disc pl-4">
                                      {digitalItems.filter(it => !it.digital_content).map((item) => (
                                        <li key={item.id}>{item.product_title}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        )}

                        {order.sellers.length > 0 && (
                          <div className="mt-3">
                            <h4 className="font-medium text-sm mb-2">Verkäufer</h4>
                            <div className="space-y-2">
                              {order.sellers.map((seller) => (
                                <div key={seller.seller_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-muted rounded">
                                  <button
                                    onClick={() => handleViewSellerProfile(seller.seller_id, seller.seller_username)}
                                    className="text-sm font-medium text-primary hover:underline text-left truncate"
                                  >
                                    @{seller.seller_username}
                                  </button>
                                  {order.order_status === 'delivered' && (
                                    <Button
                                      variant={seller.has_review ? "outline" : "default"}
                                      size="sm"
                                      onClick={() => handleReviewSeller(order.id, seller.seller_id, seller.seller_username)}
                                      disabled={seller.has_review}
                                      className="flex items-center gap-1 w-full sm:w-auto justify-center"
                                    >
                                      <Star className="h-3 w-3" />
                                      {seller.has_review ? 'Bewertet' : 'Bewerten'}
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-medium text-sm">Lieferadresse</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">
                          {order.shipping_first_name} {order.shipping_last_name}, {order.shipping_street} {order.shipping_house_number}, {order.shipping_postal_code} {order.shipping_city}, {order.shipping_country}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <ReviewModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          orderId={selectedOrderId}
          sellerId={selectedSellerId}
          sellerUsername={selectedSellerUsername}
          onReviewSubmitted={() => {
            const fetchData = async () => {
              setIsLoading(true);
              try {
                const { data: ordersData, error: ordersError } = await supabase
                  .from('orders')
                  .select('*')
                  .eq('user_id', user!.id)
                  .order('created_at', { ascending: false });

                if (ordersError) throw ordersError;
                const ordersList = ordersData || [];

                const ordersWithSellers = await Promise.all(
                  ordersList.map(async (order: any) => {
                    const { data: orderItems } = await supabase
                      .from('order_items')
                      .select(`
                        product_id,
                        products!inner(seller_id, profiles!inner(username))
                      `)
                      .eq('order_id', order.id);

                    const sellers = orderItems?.map((item: any) => ({
                      seller_id: item.products.seller_id,
                      seller_username: item.products.profiles.username,
                      has_review: false
                    })) || [];

                    if (sellers.length > 0) {
                      const { data: reviews } = await supabase
                        .from('reviews')
                        .select('seller_id')
                        .eq('order_id', order.id)
                        .eq('reviewer_id', user!.id);

                      const reviewedSellerIds = new Set(reviews?.map(r => r.seller_id) || []);
                      sellers.forEach(seller => {
                        seller.has_review = reviewedSellerIds.has(seller.seller_id);
                      });
                    }

                    return {
                      ...order,
                      sellers: sellers.filter((seller, index, self) => 
                        index === self.findIndex(s => s.seller_id === seller.seller_id)
                      )
                    };
                  })
                );

                setOrders(ordersWithSellers as any);
              } catch (e) {
                console.error('Fehler beim Laden der Bestellungen:', e);
              } finally {
                setIsLoading(false);
              }
            };
            fetchData();
            setReviewModalOpen(false);
          }}
        />

        <SellerProfileModal
          open={sellerProfileOpen}
          onOpenChange={setSellerProfileOpen}
          sellerId={selectedSellerId}
          sellerUsername={selectedSellerUsername}
        />
      </div>
    </div>
  );
};

export default Orders;