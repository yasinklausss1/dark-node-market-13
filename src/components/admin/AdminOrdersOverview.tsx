import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface OrderItem {
  id: string;
  quantity: number;
  price_eur: number;
  product: {
    title: string;
    seller_username: string;
  };
}

interface Order {
  id: string;
  user_id: string;
  total_amount_eur: number;
  status: string;
  order_status: string | null;
  created_at: string;
  buyer_username: string;
  items: OrderItem[];
}

const AdminOrdersOverview = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      // Fetch all orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, user_id, total_amount_eur, status, order_status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (ordersError) throw ordersError;

      // Get unique user IDs
      const userIds = [...new Set(ordersData?.map(o => o.user_id) || [])];
      
      // Fetch profiles for usernames
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

      // Fetch order items with product info
      const orderIds = ordersData?.map(o => o.id) || [];
      console.log('Fetching order items for orders:', orderIds.length);
      
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, order_id, quantity, price_eur, product_id')
        .in('order_id', orderIds);

      console.log('Order items fetched:', orderItems?.length, 'Error:', itemsError);

      // Fetch products for order items
      const productIds = [...new Set(orderItems?.map(oi => oi.product_id) || [])];
      const { data: products } = await supabase
        .from('products')
        .select('id, title, seller_id')
        .in('id', productIds);

      // Get seller profiles
      const sellerIds = [...new Set(products?.map(p => p.seller_id) || [])];
      const { data: sellerProfiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', sellerIds);

      const sellerMap = new Map(sellerProfiles?.map(p => [p.user_id, p.username]) || []);
      const productMap = new Map(products?.map(p => [p.id, { title: p.title, seller_id: p.seller_id }]) || []);

      // Build order items map
      const orderItemsMap = new Map<string, OrderItem[]>();
      orderItems?.forEach(oi => {
        const product = productMap.get(oi.product_id);
        const item: OrderItem = {
          id: oi.id,
          quantity: oi.quantity,
          price_eur: oi.price_eur,
          product: {
            title: product?.title || 'Unbekannt',
            seller_username: sellerMap.get(product?.seller_id || '') || 'Unbekannt'
          }
        };
        if (!orderItemsMap.has(oi.order_id)) {
          orderItemsMap.set(oi.order_id, []);
        }
        orderItemsMap.get(oi.order_id)!.push(item);
      });

      // Build final orders array
      const ordersWithDetails: Order[] = (ordersData || []).map(o => ({
        ...o,
        buyer_username: profileMap.get(o.user_id) || 'Unbekannt',
        items: orderItemsMap.get(o.id) || []
      }));

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string, orderStatus: string | null) => {
    const displayStatus = orderStatus || status;
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-600',
      confirmed: 'bg-blue-500/20 text-blue-600',
      processing: 'bg-purple-500/20 text-purple-600',
      shipped: 'bg-cyan-500/20 text-cyan-600',
      delivered: 'bg-green-500/20 text-green-600',
      cancelled: 'bg-red-500/20 text-red-600'
    };
    return (
      <Badge className={colors[displayStatus] || 'bg-muted text-muted-foreground'}>
        {displayStatus}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Alle Bestellungen</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Übersicht aller Bestellungen auf der Plattform
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAllOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Laden...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Keine Bestellungen gefunden</div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="border rounded-lg overflow-hidden">
                <div
                  className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-muted/30"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      {expandedOrders.has(order.id) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {order.id.slice(0, 8)}...
                      </span>
                    </div>
                    <span className="font-medium">{order.buyer_username}</span>
                    <span className="font-bold text-primary">€{Number(order.total_amount_eur).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    {getStatusBadge(order.status, order.order_status)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </span>
                  </div>
                </div>
                {expandedOrders.has(order.id) && (
                  <div className="border-t bg-muted/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Bestellte Produkte:</p>
                    {order.items.length > 0 ? (
                      order.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm bg-background rounded p-2">
                          <div>
                            <span className="font-medium">{item.product.title}</span>
                            <span className="text-muted-foreground"> × {item.quantity}</span>
                            <span className="text-xs text-muted-foreground ml-2">(Verkäufer: {item.product.seller_username})</span>
                          </div>
                          <span className="font-medium">€{Number(item.price_eur).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Keine Produktdetails verfügbar</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminOrdersOverview;
