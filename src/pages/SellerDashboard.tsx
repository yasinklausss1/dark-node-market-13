import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Edit, Package, User, Truck, CheckCircle } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import EditProductModal from '@/components/EditProductModal';
import OrderStatusModal from '@/components/OrderStatusModal';
import { DisputeResolutionPanel } from '@/components/DisputeResolutionPanel';
import { BulkDiscountManager } from '@/components/BulkDiscountManager';
import { ProductAddonManager } from '@/components/ProductAddonManager';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { Switch } from '@/components/ui/switch';
import { useChat } from '@/hooks/useChat';
import { ConversationsModal } from '@/components/ConversationsModal';
import { ChatModal } from '@/components/ChatModal';
import { FansignUpload } from '@/components/FansignUpload';
import { Product } from '@/types/Product';

interface Order {
  id: string;
  user_id: string;
  total_amount_eur: number;
  order_status: string;
  created_at: string;
  shipping_first_name: string | null;
  shipping_last_name: string | null;
  shipping_street: string | null;
  shipping_house_number: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  buyer_username: string;
  fansign_image_url: string | null;
  fansign_uploaded_at: string | null;
  items: {
    order_item_id: string;
    quantity: number;
    price_eur: number;
    product_title: string | null;
  }[] | null;
  addons?: Array<{
    addon_name: string;
    custom_value: string | null;
    price_eur: number;
  }>;
}
const SellerDashboard = () => {
  const {
    user,
    profile,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    stock: '',
    fansignDeliveryDays: '1-2' as '1-2' | '3' | '1-4'
  });
  const [productImages, setProductImages] = useState<string[]>([]);
  const [enableBulkDiscount, setEnableBulkDiscount] = useState(false);
  const [bulkDiscountData, setBulkDiscountData] = useState({
    minQuantity: '',
    discountPercentage: ''
  });
  const [newProductAddons, setNewProductAddons] = useState<Array<{name: string, price_eur: number, is_required: boolean}>>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('');

  // Chat state
  const [conversationsModalOpen, setConversationsModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  // Get chat data
  const {
    conversations
  } = useChat();
  useEffect(() => {
    fetchCategories();
    if (profile?.role === 'seller' || profile?.role === 'admin') {
      fetchProducts();
      fetchOrders();
    }
  }, [profile]);
  const fetchCategories = async () => {
    const {
      data,
      error
    } = await supabase.from('categories').select('*').order('name');
    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    setCategories(data || []);
  };
  const fetchProducts = async () => {
    if (!user) return;
    const {
      data,
      error
    } = await supabase.from('products').select('*').eq('seller_id', user.id).order('created_at', {
      ascending: false
    });
    if (error) {
      console.error('Error fetching products:', error);
      return;
    }
    setProducts((data || []) as Product[]);
  };
  const fetchOrders = async () => {
    if (!user) return;
    const {
      data,
      error
    } = await supabase.rpc('get_seller_orders', {
      seller_uuid: user.id
    });
    if (error) {
      console.error('Error fetching seller orders:', error);
      return;
    }
    
    const ordersData = (data as any) || [];
    
    // Fetch add-ons for each order
    const ordersWithAddons = await Promise.all(
      ordersData.map(async (order: any) => {
        const { data: addonsData } = await supabase
          .from('order_addon_selections')
          .select('addon_name, custom_value, price_eur')
          .eq('order_id', order.id);
        
        return {
          ...order,
          addons: addonsData || []
        };
      })
    );
    
    setOrders(ordersWithAddons);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate at least one image is required
    if (!formData.imageUrl && productImages.length === 0) {
      toast({
        title: "Bild erforderlich",
        description: "Bitte laden Sie mindestens ein Bild für Ihr Produkt hoch.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    const {
      data,
      error
    } = await supabase.from('products').insert({
      title: formData.title,
      description: formData.description,
      price: parseFloat(formData.price),
      category: formData.category,
      image_url: formData.imageUrl || null,
      seller_id: user.id,
      is_active: true,
      stock: parseInt(formData.stock),
      fansign_delivery_days: formData.fansignDeliveryDays
    }).select().single();
    if (error) {
      toast({
        title: "Error adding product",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // If bulk discount is enabled, create it
      if (enableBulkDiscount && bulkDiscountData.minQuantity && bulkDiscountData.discountPercentage) {
        const {
          error: discountError
        } = await supabase.from('bulk_discounts').insert({
          product_id: data.id,
          min_quantity: parseInt(bulkDiscountData.minQuantity),
          discount_percentage: parseFloat(bulkDiscountData.discountPercentage)
        });
        if (discountError) {
          console.error("Bulk discount error:", discountError);
        }
      }

      // Create add-ons if any were added
      if (newProductAddons.length > 0) {
        const addonsToInsert = newProductAddons.map(addon => ({
          product_id: data.id,
          name: addon.name,
          price_eur: addon.price_eur,
          is_required: addon.is_required
        }));
        
        const { error: addonsError } = await supabase
          .from('product_addons')
          .insert(addonsToInsert);
        
        if (addonsError) {
          console.error("Add-ons error:", addonsError);
        }
      }

      // Insert product images if any
      if (productImages.length > 0) {
        const imagesToInsert = productImages.map((url, index) => ({
          product_id: data.id,
          image_url: url,
          display_order: index
        }));
        
        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imagesToInsert);
        
        if (imagesError) {
          console.error("Images error:", imagesError);
          toast({
            title: "Warning",
            description: "Product created but some images couldn't be saved.",
            variant: "destructive"
          });
        }
      }

      toast({
        title: "Product added",
        description: "Your product has been successfully added with all add-ons."
      });

      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        imageUrl: '',
        stock: '',
        fansignDeliveryDays: '1-2' as '1-2' | '3' | '1-4'
      });
      setEnableBulkDiscount(false);
      setBulkDiscountData({
        minQuantity: '',
        discountPercentage: ''
      });
      setNewProductAddons([]);
      setProductImages([]);
      fetchProducts();
    }
    setIsLoading(false);
  };
  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    const {
      error
    } = await supabase.from('products').update({
      is_active: !isActive
    }).eq('id', productId);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      fetchProducts();
      toast({
        title: "Status changed",
        description: "Product status has been updated."
      });
    }
  };
  const deleteProduct = async (productId: string, productTitle: string) => {
    if (!confirm(`Are you sure you want to delete the product "${productTitle}"?`)) {
      return;
    }

    // First check if product has orders
    const {
      data: orderItems,
      error: checkError
    } = await supabase.from('order_items').select('id').eq('product_id', productId).limit(1);
    if (checkError) {
      toast({
        title: "Error checking product",
        description: checkError.message,
        variant: "destructive"
      });
      return;
    }

    // If product has orders, deactivate instead of delete
    if (orderItems && orderItems.length > 0) {
      const {
        error
      } = await supabase.from('products').update({
        is_active: false
      }).eq('id', productId);
      if (error) {
        toast({
          title: "Error deactivating",
          description: error.message,
          variant: "destructive"
        });
      } else {
        fetchProducts();
        toast({
          title: "Product deactivated",
          description: "This product has existing orders and was deactivated instead of deleted."
        });
      }
      return;
    }

    // No orders, safe to delete
    const {
      error
    } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive"
      });
    } else {
      fetchProducts();
      toast({
        title: "Product deleted",
        description: "The product has been successfully deleted."
      });
    }
  };
  const handleUpdateOrderStatus = (orderId: string, currentStatus: string) => {
    setSelectedOrderId(orderId);
    setSelectedOrderStatus(currentStatus);
    setStatusModalOpen(true);
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
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>;
  }
  if (!user || profile?.role !== 'seller' && profile?.role !== 'admin') {
    return <Navigate to="/marketplace" replace />;
  }
  return <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-bold font-cinzel">Seller Dashboard</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/marketplace')}>
            Back to Marketplace
          </Button>
        </div>

        {/* Seller Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Seller Rules</CardTitle>
            <CardDescription>Please follow these professional guidelines</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Do not scam or mislead users. Honesty is mandatory.</li>
              
              <li>Describe products truthfully with real photos and specifications.</li>
              <li>Maintain professional communication and respond within 24–48 hours.</li>
              <li>Comply with all applicable laws and do not list prohibited items.</li>
              <li>Respect user privacy; never share buyer information.</li>
              
            </ul>
          </CardContent>
        </Card>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className={`grid w-full ${profile?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Orders
            </TabsTrigger>
            {profile?.role === 'admin' && <TabsTrigger value="disputes" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Disputes
              </TabsTrigger>}
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Product Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Add New Product</CardTitle>
                  <CardDescription>
                    Add a new product to your shop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Product Name</Label>
                      <Input id="title" value={formData.title} onChange={e => setFormData({
                      ...formData,
                      title: e.target.value
                    })} required />
                    </div>

                    <div>
                      <Label htmlFor="price">Price (EUR)</Label>
                      <Input id="price" type="number" step="0.01" value={formData.price} onChange={e => setFormData({
                      ...formData,
                      price: e.target.value
                    })} required />
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={value => setFormData({
                      ...formData,
                      category: value
                    })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="stock">Stock</Label>
                      <Input id="stock" type="number" min="0" value={formData.stock} onChange={e => setFormData({
                      ...formData,
                      stock: e.target.value
                    })} required />
                    </div>

                    <div>
                      <Label htmlFor="fansignDeliveryDays">Fansign Lieferzeit (Tage)</Label>
                      <Select value={formData.fansignDeliveryDays} onValueChange={value => setFormData({
                      ...formData,
                      fansignDeliveryDays: value as '1-2' | '3' | '1-4'
                    })} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Wähle Lieferzeit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-2">1-2 Tage</SelectItem>
                          <SelectItem value="3">3 Tage</SelectItem>
                          <SelectItem value="1-4">1-4 Tage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Produktbilder (mehrere möglich)</Label>
                      <MultiImageUpload 
                        images={productImages} 
                        onChange={setProductImages}
                        maxImages={5}
                      />
                    </div>

                    <div>
                      <Label htmlFor="imageUrl">Hauptbild (optional - wird aus Galerie verwendet)</Label>
                      <FileUpload value={formData.imageUrl} onChange={url => setFormData({
                      ...formData,
                      imageUrl: url
                    })} />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={formData.description} onChange={e => setFormData({
                      ...formData,
                      description: e.target.value
                    })} rows={4} />
                    </div>

                    {/* Bulk Discount Option */}
                    

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      <Upload className="h-4 w-4 mr-2" />
                      {isLoading ? "Adding..." : "Add Product"}
                    </Button>
                  </form>

                  {/* Add-ons Section - Before product is created */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">Product Add-ons (Optional)</h3>
                    <p className="text-sm text-muted-foreground">
                      Add customizable options for your product (e.g., custom names, extra services)
                    </p>
                    
                    {/* Display existing addons */}
                    {newProductAddons.map((addon, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{addon.name}</div>
                          <div className="text-sm text-muted-foreground">
                            +€{addon.price_eur.toFixed(2)} {addon.is_required && "(Erforderlich)"}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {
                            setNewProductAddons(newProductAddons.filter((_, i) => i !== index));
                          }}
                        >
                          <Upload className="h-4 w-4 rotate-180" />
                        </Button>
                      </div>
                    ))}

                    {/* Add new addon inline */}
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Add-on Name (z.B. Custom Name)"
                        id="addon-name"
                        type="text"
                      />
                      <Input
                        placeholder="Preis (EUR)"
                        id="addon-price"
                        type="number"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="addon-required"
                        className="h-4 w-4"
                      />
                      <Label htmlFor="addon-required" className="cursor-pointer text-sm">
                        Erforderlich
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const nameInput = document.getElementById('addon-name') as HTMLInputElement;
                        const priceInput = document.getElementById('addon-price') as HTMLInputElement;
                        const requiredInput = document.getElementById('addon-required') as HTMLInputElement;
                        
                        if (nameInput.value.trim()) {
                          setNewProductAddons([...newProductAddons, {
                            name: nameInput.value,
                            price_eur: parseFloat(priceInput.value) || 0,
                            is_required: requiredInput.checked
                          }]);
                          nameInput.value = '';
                          priceInput.value = '';
                          requiredInput.checked = false;
                        }
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add-on hinzufügen
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Products List */}
              <Card>
                <CardHeader>
                  <CardTitle>My Products ({products.length})</CardTitle>
                  <CardDescription>
                    Manage your available products
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {products.map(product => <div key={product.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold">{product.title}</h3>
                            <p className="text-sm text-muted-foreground">{product.category}</p>
                            <p className="text-lg font-bold text-primary">€{product.price}</p>
                            <p className="text-sm text-muted-foreground">Stock: {product.stock} units</p>
                            {product.stock === 0 && <p className="text-sm text-red-500 font-medium">Out of stock</p>}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => {
                          setEditingProduct(product);
                          setEditModalOpen(true);
                        }}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteProduct(product.id, product.title)}>
                              Delete
                            </Button>
                            <Button variant={product.is_active ? "destructive" : "default"} size="sm" onClick={() => toggleProductStatus(product.id, product.is_active)}>
                              {product.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </div>
                      </div>)}
                    {products.length === 0 && <p className="text-muted-foreground text-center py-8">
                        No products added yet.
                      </p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Orders ({orders.length})</CardTitle>
                <CardDescription>
                  View and manage orders containing your products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {orders.map(order => <div key={order.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.order_status)}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.order_status)}`}>
                                {order.order_status}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-lg font-bold text-primary">€{order.total_amount_eur.toFixed(2)}</p>
                          <p className="text-sm">Customer: <span className="font-medium">@{order.buyer_username}</span></p>
                          
                          {/* Tracking Information */}
                          {order.tracking_number && <div className="mt-2 p-2 bg-muted rounded">
                              <p className="text-sm font-medium">Tracking: {order.tracking_number}</p>
                              {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                  Track Package
                                </a>}
                            </div>}
                          
                          <div className="mt-2">
                            <h4 className="font-medium text-sm">Items:</h4>
                            {order.items?.map(item => <p key={item.order_item_id} className="text-xs text-muted-foreground">
                                {item.quantity}x {item.product_title || 'Product unavailable'} (€{item.price_eur.toFixed(2)})
                              </p>)}
                          </div>

                          {/* Add-ons Section */}
                          {order.addons && order.addons.length > 0 && (
                            <div className="mt-3 p-2 bg-muted/50 rounded">
                              <h4 className="font-medium text-sm mb-1">Add-ons:</h4>
                              {order.addons.map((addon, idx) => (
                                <p key={idx} className="text-xs text-muted-foreground">
                                  • {addon.addon_name}
                                  {addon.custom_value && `: "${addon.custom_value}"`}
                                  {addon.price_eur > 0 && ` (+€${addon.price_eur.toFixed(2)})`}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Update Status Button */}
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => handleUpdateOrderStatus(order.id, order.order_status)}>
                            Update Status
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Shipping Address:</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>{order.shipping_first_name} {order.shipping_last_name}</p>
                              <p>{order.shipping_street} {order.shipping_house_number}</p>
                              <p>{order.shipping_postal_code} {order.shipping_city}</p>
                              <p>{order.shipping_country}</p>
                            </div>
                          </div>

                          {/* Fansign Upload Section */}
                          <div>
                            <h4 className="font-medium text-sm mb-2">Fansign Image:</h4>
                            <FansignUpload
                              orderId={order.id}
                              currentImageUrl={order.fansign_image_url}
                              onUploadSuccess={() => fetchOrders()}
                            />
                          </div>
                        </div>
                      </div>
                    </div>)}
                  {orders.length === 0 && <p className="text-muted-foreground text-center py-8">
                      No orders yet.
                    </p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {profile?.role === 'admin' && <TabsContent value="disputes" className="space-y-6">
              <DisputeResolutionPanel />
            </TabsContent>}
        </Tabs>

        {/* Edit Product Modal */}
        <EditProductModal product={editingProduct} open={editModalOpen} onOpenChange={setEditModalOpen} onProductUpdated={fetchProducts} />

        {/* Order Status Modal */}
        <OrderStatusModal open={statusModalOpen} onOpenChange={setStatusModalOpen} orderId={selectedOrderId} currentStatus={selectedOrderStatus} onStatusUpdated={fetchOrders} />

        {/* Chat Modal */}
        <ChatModal open={chatModalOpen} onOpenChange={open => {
        setChatModalOpen(open);
        if (!open) {
          setSelectedConversation(null);
        }
      }} productId={selectedConversation?.product_id} sellerId={selectedConversation?.seller_id} productTitle={selectedConversation?.product_title} sellerUsername={selectedConversation?.other_user_username} conversationId={selectedConversation?.id} conversationStatus={selectedConversation?.status} onBackToConversations={() => {
        setChatModalOpen(false);
        setConversationsModalOpen(true);
      }} />
      </div>
    </div>;
};
export default SellerDashboard;