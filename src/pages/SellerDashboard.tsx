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
import { MultiFileUpload } from '@/components/ui/multi-file-upload';
import EditProductModal from '@/components/EditProductModal';
import OrderStatusModal from '@/components/OrderStatusModal';
import { DisputeResolutionPanel } from '@/components/DisputeResolutionPanel';
import { BulkDiscountManager } from '@/components/BulkDiscountManager';
import { Switch } from '@/components/ui/switch';
import { useChat } from '@/hooks/useChat';
import { ConversationsModal } from '@/components/ConversationsModal';
import { ChatModal } from '@/components/ChatModal';
import DigitalContentModal from '@/components/DigitalContentModal';
import { FileText } from 'lucide-react';
import SellerOwnProfilePanel from '@/components/SellerOwnProfilePanel';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  stock: number;
}

interface OrderItem {
  order_item_id: string;
  quantity: number;
  price_eur: number;
  product_title: string | null;
  product_type?: string;
  digital_content?: string | null;
  digital_content_delivered_at?: string | null;
}

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
  items: OrderItem[] | null;
}

const SellerDashboard = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    subcategoryId: '' as string,
    imageUrls: [] as string[],
    stock: '',
    productType: 'physical' as 'physical' | 'digital',
    digitalContent: ''
  });
  const [enableBulkDiscount, setEnableBulkDiscount] = useState(false);
  const [bulkDiscountData, setBulkDiscountData] = useState({
    minQuantity: '',
    discountPercentage: ''
  });
  const [newProductId, setNewProductId] = useState<string | null>(null);
  const [newProductTitle, setNewProductTitle] = useState<string>('');

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('');
  
  // Chat state
  const [conversationsModalOpen, setConversationsModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  
  // Digital content modal state
  const [digitalContentModalOpen, setDigitalContentModalOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<{
    orderItemId: string;
    productTitle: string;
    currentContent: string | null;
  } | null>(null);
  
  // Get chat data
  const { conversations } = useChat();

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    if (profile?.role === 'seller' || profile?.role === 'admin') {
      fetchProducts();
      fetchOrders();
    }
  }, [profile]);

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

  const fetchSubcategories = async () => {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching subcategories:', error);
      return;
    }

    setSubcategories(data || []);
  };

  const getSelectedCategoryId = () => {
    const category = categories.find(c => c.name === formData.category);
    return category?.id || '';
  };

  const fetchProducts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    setProducts(data || []);
  };

const fetchOrders = async () => {
  if (!user) return;

  const { data, error } = await supabase
    .rpc('get_seller_orders', { seller_uuid: user.id });

  if (error) {
    console.error('Error fetching seller orders:', error);
    return;
  }

  setOrders((data as any) || []);
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate at least one image is required
    if (formData.imageUrls.length === 0) {
      toast({
        title: "Bild erforderlich",
        description: "Bitte lade mindestens ein Bild für dein Produkt hoch.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from('products')
      .insert({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        subcategory_id: formData.subcategoryId && formData.subcategoryId !== 'none' ? formData.subcategoryId : null,
        image_url: formData.imageUrls[0] || null,
        seller_id: user.id,
        is_active: true,
        stock: parseInt(formData.stock),
        product_type: formData.productType
      })
      .select()
      .single();

    // Insert additional images into product_images table
    if (!error && data && formData.imageUrls.length > 0) {
      const imageInserts = formData.imageUrls.map((url, index) => ({
        product_id: data.id,
        image_url: url,
        display_order: index
      }));

      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imageInserts);

      if (imagesError) {
        console.error('Error inserting product images:', imagesError);
      }
    }

    if (error) {
      toast({
        title: "Fehler beim Hinzufügen",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Produkt hinzugefügt",
        description: "Dein Produkt wurde erfolgreich hinzugefügt."
      });

      // If bulk discount is enabled, create it
      if (enableBulkDiscount && bulkDiscountData.minQuantity && bulkDiscountData.discountPercentage) {
        const { error: discountError } = await supabase
          .from('bulk_discounts')
          .insert({
            product_id: data.id,
            min_quantity: parseInt(bulkDiscountData.minQuantity),
            discount_percentage: parseFloat(bulkDiscountData.discountPercentage)
          });

        if (discountError) {
          toast({
            title: "Produkt hinzugefügt, aber Mengenrabatt fehlgeschlagen",
            description: discountError.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Produkt und Mengenrabatt hinzugefügt",
            description: "Dein Produkt und Mengenrabatt wurden erfolgreich erstellt."
          });
        }
      }

      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        subcategoryId: '',
        imageUrls: [],
        stock: '',
        productType: 'physical',
        digitalContent: ''
      });
      setEnableBulkDiscount(false);
      setBulkDiscountData({
        minQuantity: '',
        discountPercentage: ''
      });
      fetchProducts();
    }

    setIsLoading(false);
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !isActive })
      .eq('id', productId);

    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    } else {
      fetchProducts();
      toast({
        title: "Status geändert",
        description: "Produktstatus wurde aktualisiert."
      });
    }
  };

  const deleteProduct = async (productId: string, productTitle: string) => {
    if (!confirm(`Bist du sicher, dass du das Produkt "${productTitle}" löschen möchtest?`)) {
      return;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive"
      });
    } else {
      fetchProducts();
      toast({
        title: "Produkt gelöscht",
        description: "Das Produkt wurde erfolgreich gelöscht."
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'confirmed': return 'Bestätigt';
      case 'processing': return 'In Bearbeitung';
      case 'shipped': return 'Versendet';
      case 'delivered': return 'Geliefert';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  const getCountryName = (countryCode: string | null): string => {
    if (!countryCode) return '';
    const countryMap: Record<string, string> = {
      'DE': 'Deutschland',
      'AT': 'Österreich',
      'CH': 'Schweiz',
      'NL': 'Niederlande',
      'BE': 'Belgien',
      'FR': 'Frankreich',
      'IT': 'Italien',
      'ES': 'Spanien',
      'PT': 'Portugal',
      'PL': 'Polen',
      'CZ': 'Tschechien',
      'DK': 'Dänemark',
      'SE': 'Schweden',
      'NO': 'Norwegen',
      'FI': 'Finnland',
      'GB': 'Großbritannien',
      'UK': 'Großbritannien',
      'US': 'USA',
      'CA': 'Kanada',
      'AU': 'Australien',
      'LU': 'Luxemburg',
      'IE': 'Irland',
      'GR': 'Griechenland',
      'HU': 'Ungarn',
      'SK': 'Slowakei',
      'SI': 'Slowenien',
      'HR': 'Kroatien',
      'RO': 'Rumänien',
      'BG': 'Bulgarien',
      'LT': 'Litauen',
      'LV': 'Lettland',
      'EE': 'Estland'
    };
    return countryMap[countryCode.toUpperCase()] || countryCode;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (profile?.role !== 'seller' && profile?.role !== 'admin')) {
    return <Navigate to="/marketplace" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-3xl font-bold font-cinzel">Verkäufer-Dashboard</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/marketplace')}
          >
            Zurück zum Marktplatz
          </Button>
        </div>

        {/* Seller Rules */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Verkäuferregeln</CardTitle>
            <CardDescription className="text-sm">Bitte befolge diese professionellen Richtlinien</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-xs sm:text-sm text-muted-foreground">
              <li>Betrug oder Täuschung von Nutzern ist untersagt. Ehrlichkeit ist Pflicht.</li>
              <li>Versende Bestellungen zeitnah und gib genaue Tracking-Informationen an.</li>
              <li>Beschreibe Produkte wahrheitsgemäß mit echten Fotos und Spezifikationen.</li>
              <li>Halte professionelle Kommunikation ein und antworte innerhalb von 24-48 Stunden.</li>
              <li>Beachte alle geltenden Gesetze und liste keine verbotenen Artikel.</li>
              <li>Respektiere die Privatsphäre der Nutzer; teile keine Käuferinformationen.</li>
              <li>Storniere und erstatte Bestellungen, die du nicht erfüllen kannst.</li>
            </ul>
          </CardContent>
        </Card>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className={`grid w-full ${profile?.role === 'admin' ? 'grid-cols-4' : 'grid-cols-3'} h-auto`}>
            <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Mein Profil</span>
              <span className="sm:hidden">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Produkte</span>
              <span className="sm:hidden">Prod.</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Bestellungen</span>
              <span className="sm:hidden">Best.</span>
            </TabsTrigger>
            {profile?.role === 'admin' && (
              <TabsTrigger value="disputes" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Streitfälle</span>
                <span className="sm:hidden">Streit</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <SellerOwnProfilePanel />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Product Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Neues Produkt hinzufügen</CardTitle>
                  <CardDescription>
                    Füge ein neues Produkt zu deinem Shop hinzu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="productType">Produkttyp</Label>
                      <Select 
                        value={formData.productType} 
                        onValueChange={(value: 'physical' | 'digital') => setFormData({...formData, productType: value, category: ''})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Produkttyp wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="physical">Materiell (Versand erforderlich)</SelectItem>
                          <SelectItem value="digital">Digital (kein Versand)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.productType === 'digital' && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                            Digitales Produkt
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Bei digitalen Produkten gibst du die Daten (Codes, Account-Daten, Links) erst nach dem Kauf ein. 
                          Du siehst die Bestellung im "Bestellungen"-Tab und kannst dort die Daten für jeden Käufer individuell eingeben.
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="title">Produktname</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="price">Preis (EUR)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Kategorie</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData({...formData, category: value, subcategoryId: ''})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kategorie wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((category) => category.product_type === formData.productType)
                            .map((category) => (
                              <SelectItem key={category.id} value={category.name}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subcategory */}
                    {subcategories.filter(s => s.category_id === getSelectedCategoryId()).length > 0 && (
                      <div>
                        <Label htmlFor="subcategory">Unterkategorie (optional)</Label>
                        <Select 
                          value={formData.subcategoryId} 
                          onValueChange={(value) => setFormData({...formData, subcategoryId: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Unterkategorie wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Keine Unterkategorie</SelectItem>
                            {subcategories
                              .filter((sub) => sub.category_id === getSelectedCategoryId())
                              .map((sub) => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  {sub.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="stock">Bestand</Label>
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="imageUrls">Produktbilder</Label>
                      <MultiFileUpload
                        value={formData.imageUrls}
                        onChange={(urls) => setFormData({...formData, imageUrls: urls})}
                        minFiles={1}
                        maxFiles={10}
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Beschreibung</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={4}
                      />
                    </div>

                    {/* Bulk Discount Option */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="enable-bulk-discount" className="text-sm font-medium">
                            Mengenrabatt aktivieren
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Biete Rabatte für größere Mengen an
                          </p>
                        </div>
                        <Switch
                          id="enable-bulk-discount"
                          checked={enableBulkDiscount}
                          onCheckedChange={setEnableBulkDiscount}
                        />
                      </div>

                      {enableBulkDiscount && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="min-quantity" className="text-xs">
                              Mind. Menge
                            </Label>
                            <Input
                              id="min-quantity"
                              type="number"
                              min="2"
                              placeholder="z.B. 5"
                              value={bulkDiscountData.minQuantity}
                              onChange={(e) => setBulkDiscountData({
                                ...bulkDiscountData, 
                                minQuantity: e.target.value
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="discount-percentage" className="text-xs">
                              Rabatt %
                            </Label>
                            <Input
                              id="discount-percentage"
                              type="number"
                              min="1"
                              max="50"
                              placeholder="z.B. 10"
                              value={bulkDiscountData.discountPercentage}
                              onChange={(e) => setBulkDiscountData({
                                ...bulkDiscountData, 
                                discountPercentage: e.target.value
                              })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      <Upload className="h-4 w-4 mr-2" />
                      {isLoading ? "Wird hinzugefügt..." : "Produkt hinzufügen"}
                    </Button>
                  </form>

                  {/* Bulk Discount Management - Show after product is created */}
                  {newProductId && (
                    <div className="mt-6 border-t pt-6">
                      <BulkDiscountManager 
                        productId={newProductId}
                        productTitle={newProductTitle}
                      />
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => {
                          setNewProductId(null);
                          setNewProductTitle('');
                        }}
                      >
                        Produkteinrichtung abschließen
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Products List */}
              <Card>
                <CardHeader>
                  <CardTitle>Meine Produkte ({products.length})</CardTitle>
                  <CardDescription>
                    Verwalte deine verfügbaren Produkte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {products.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold">{product.title}</h3>
                            <p className="text-sm text-muted-foreground">{product.category}</p>
                            <p className="text-lg font-bold text-primary">€{product.price}</p>
                            <p className="text-sm text-muted-foreground">Bestand: {product.stock} Stück</p>
                            {product.stock === 0 && (
                              <p className="text-sm text-red-500 font-medium">Nicht auf Lager</p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingProduct(product);
                                setEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Bearbeiten
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteProduct(product.id, product.title)}
                            >
                              Löschen
                            </Button>
                            <Button
                              variant={product.is_active ? "destructive" : "default"}
                              size="sm"
                              onClick={() => toggleProductStatus(product.id, product.is_active)}
                            >
                              {product.is_active ? "Deaktivieren" : "Aktivieren"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {products.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        Noch keine Produkte hinzugefügt.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kundenbestellungen ({orders.length})</CardTitle>
                <CardDescription>
                  Zeige und verwalte Bestellungen mit deinen Produkten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Bestellung #{order.id.slice(0, 8)}</h3>
                            {/* Only show status for orders with physical products */}
                            {order.items?.some(item => item.product_type !== 'digital') && (
                              <div className="flex items-center gap-2">
                                {getStatusIcon(order.order_status)}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.order_status)}`}>
                                  {getStatusLabel(order.order_status)}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('de-DE')}
                          </p>
                          <p className="text-lg font-bold text-primary">€{order.total_amount_eur.toFixed(2)}</p>
                          <p className="text-sm">Kunde: <span className="font-medium">@{order.buyer_username}</span></p>
                          
                          {/* Tracking Information */}
                          {order.tracking_number && (
                            <div className="mt-2 p-2 bg-muted rounded">
                              <p className="text-sm font-medium">Sendungsnummer: {order.tracking_number}</p>
                              {order.tracking_url && (
                                <a 
                                  href={order.tracking_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  Sendung verfolgen
                                </a>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-2">
                            <h4 className="font-medium text-sm">Artikel:</h4>
                            {order.items?.map((item) => (
                              <div key={item.order_item_id} className="text-xs text-muted-foreground mb-2">
                                <p>
                                  {item.quantity}x {item.product_title || 'Produkt nicht verfügbar'} (€{item.price_eur.toFixed(2)})
                                  {item.product_type === 'digital' && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Digital</span>
                                  )}
                                </p>
                                {/* Digital content delivery button */}
                                {item.product_type === 'digital' && (
                                  <div className="mt-1">
                                    {item.digital_content ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-green-600 text-xs">✓ Daten geliefert</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={() => {
                                              setSelectedOrderItem({
                                                orderItemId: item.order_item_id,
                                                productTitle: item.product_title || 'Produkt',
                                                currentContent: item.digital_content || null
                                              });
                                              setDigitalContentModalOpen(true);
                                            }}
                                          >
                                            Bearbeiten
                                          </Button>
                                        </div>
                                        <div className="bg-muted p-2 rounded text-xs">
                                          <p className="font-medium text-foreground mb-1">Eingegebene Daten:</p>
                                          <pre className="whitespace-pre-wrap break-all font-mono text-muted-foreground">
                                            {item.digital_content}
                                          </pre>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="h-6 text-xs mt-1"
                                        onClick={() => {
                                          setSelectedOrderItem({
                                            orderItemId: item.order_item_id,
                                            productTitle: item.product_title || 'Produkt',
                                            currentContent: null
                                          });
                                          setDigitalContentModalOpen(true);
                                        }}
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        Daten eingeben
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Update Status Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => handleUpdateOrderStatus(order.id, order.order_status)}
                          >
                            Status aktualisieren
                          </Button>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">Lieferadresse:</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>{order.shipping_first_name} {order.shipping_last_name}</p>
                            <p>{order.shipping_street} {order.shipping_house_number}</p>
                            <p>{order.shipping_postal_code} {order.shipping_city}</p>
                            <p>{getCountryName(order.shipping_country)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      Noch keine Bestellungen.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {profile?.role === 'admin' && (
            <TabsContent value="disputes" className="space-y-6">
              <DisputeResolutionPanel />
            </TabsContent>
          )}
        </Tabs>

        {/* Edit Product Modal */}
        <EditProductModal
          product={editingProduct}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onProductUpdated={fetchProducts}
        />

        {/* Order Status Modal */}
        <OrderStatusModal
          open={statusModalOpen}
          onOpenChange={setStatusModalOpen}
          orderId={selectedOrderId}
          currentStatus={selectedOrderStatus}
          onStatusUpdated={fetchOrders}
        />

        {/* Chat Modal */}
        <ChatModal
          open={chatModalOpen}
          onOpenChange={(open) => {
            setChatModalOpen(open);
            if (!open) {
              setSelectedConversation(null);
            }
          }}
          productId={selectedConversation?.product_id}
          sellerId={selectedConversation?.seller_id}
          productTitle={selectedConversation?.product_title}
          sellerUsername={selectedConversation?.other_user_username}
          conversationId={selectedConversation?.id}
          conversationStatus={selectedConversation?.status}
          onBackToConversations={() => {
            setChatModalOpen(false);
            setConversationsModalOpen(true);
          }}
        />

        {/* Digital Content Modal */}
        {selectedOrderItem && (
          <DigitalContentModal
            open={digitalContentModalOpen}
            onOpenChange={setDigitalContentModalOpen}
            orderItemId={selectedOrderItem.orderItemId}
            productTitle={selectedOrderItem.productTitle}
            currentContent={selectedOrderItem.currentContent}
            onContentSaved={fetchOrders}
          />
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;
