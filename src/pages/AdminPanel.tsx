import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Plus, Users, Edit, Eye, Wifi, Bitcoin, RefreshCw, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EditProductModal from '@/components/EditProductModal';
import NewsEditor from '@/components/NewsEditor';
import { useUserPresence } from '@/hooks/useUserPresence';

interface UserAddress {
  username: string;
  user_id: string;
  currency: string;
  address: string;
  created_at: string;
}

const AdminPanel = () => {
  const { user, profile, loading } = useAuth();
  const { onlineUsers, onlineCount } = useUserPresence();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [regeneratingUser, setRegeneratingUser] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchUserCount();
    fetchAllProducts();
    fetchUserAddresses();
    
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
  }, []);

  const fetchUserAddresses = async () => {
    const { data, error } = await supabase
      .from('user_addresses')
      .select('user_id, currency, address, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user addresses:', error);
      return;
    }

    // Fetch profiles separately to get usernames
    const userIds = [...new Set(data?.map(a => a.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
    
    const addressesWithUsernames = data?.map(addr => ({
      ...addr,
      username: profileMap.get(addr.user_id) || 'Unbekannt'
    })) || [];

    setUserAddresses(addressesWithUsernames);
  };

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

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    
    setIsLoading(true);
    
    const { error } = await supabase
      .from('categories')
      .insert({ name: newCategory.trim() });
    
    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Kategorie hinzugefügt",
        description: `${newCategory} wurde erfolgreich hinzugefügt.`
      });
      setNewCategory('');
      fetchCategories();
    }
    
    setIsLoading(false);
  };

  const fetchAllProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        profiles!products_seller_id_fkey(username)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    setProducts(data || []);
  };

  const createNewUser = async () => {
    if (!newUserForm.username.trim() || !newUserForm.password) {
      toast({
        title: "Fehler",
        description: "Bitte Benutzername und Passwort eingeben",
        variant: "destructive"
      });
      return;
    }

    if (newUserForm.password.length < 7) {
      toast({
        title: "Fehler",
        description: "Passwort muss mindestens 7 Zeichen lang sein",
        variant: "destructive"
      });
      return;
    }

    if (newUserForm.password !== newUserForm.confirmPassword) {
      toast({
        title: "Fehler",
        description: "Passwörter stimmen nicht überein",
        variant: "destructive"
      });
      return;
    }

    setCreatingUser(true);
    
    try {
      // Generate email from username (same pattern as normal signup)
      const email = `${newUserForm.username.trim()}@example.com`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password: newUserForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: newUserForm.username.trim(),
            role: 'seller'
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Fehler",
            description: "Dieser Benutzername ist bereits vergeben",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Nutzer erstellt",
          description: `${newUserForm.username} wurde erfolgreich registriert.`
        });
        setNewUserForm({ username: '', password: '', confirmPassword: '' });
        fetchUserCount();
        fetchUserAddresses();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Fehler",
        description: error.message || "Nutzer konnte nicht erstellt werden",
        variant: "destructive"
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const removeCategory = async (categoryId: string, categoryName: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);
    
    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Kategorie entfernt",
        description: `${categoryName} wurde entfernt.`
      });
      fetchCategories();
    }
  };

  const deleteProduct = async (productId: string, productTitle: string) => {
    if (!confirm(`Sind Sie sicher, dass Sie das Produkt "${productTitle}" löschen möchten?`)) {
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
      fetchAllProducts();
      toast({
        title: "Produkt gelöscht",
        description: "Das Produkt wurde erfolgreich gelöscht."
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/marketplace" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-3xl font-bold font-cinzel">Admin Panel</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/marketplace')}
          >
            Zurück zum Marktplatz
          </Button>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Registrierte Nutzer</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Gesamtanzahl registrierter Benutzer
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {userCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Wifi className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                <span>Live Online Nutzer</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Nutzer die gerade aktiv sind
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3">
                <div className="text-2xl sm:text-3xl font-bold text-green-500">
                  {onlineCount}
                </div>
                {onlineUsers.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Online jetzt:</p>
                    {onlineUsers.map((user) => (
                      <div key={user.user_id} className="flex items-center space-x-2 text-xs sm:text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="truncate">{user.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create New User */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Neuen Nutzer erstellen</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Registriere einen neuen Benutzer manuell
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-username" className="text-sm">Benutzername</Label>
                <Input
                  id="new-username"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Benutzername"
                />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Alle neuen Nutzer werden automatisch als Verkäufer erstellt.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm">Passwort (min. 7 Zeichen)</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Passwort"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm">Passwort bestätigen</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={newUserForm.confirmPassword}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Passwort bestätigen"
                />
              </div>
            </div>
            <Button 
              onClick={createNewUser}
              disabled={creatingUser || !newUserForm.username.trim() || !newUserForm.password}
              className="w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {creatingUser ? 'Wird erstellt...' : 'Nutzer erstellen'}
            </Button>
          </CardContent>
        </Card>

        {/* User Crypto Addresses */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Bitcoin className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              <span>Nutzer Krypto-Adressen</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Generierte BTC und LTC Adressen aller Nutzer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(() => {
                // Group addresses by user
                const groupedByUser = userAddresses.reduce((acc, addr) => {
                  if (!acc[addr.user_id]) {
                    acc[addr.user_id] = { username: addr.username, addresses: [] };
                  }
                  acc[addr.user_id].addresses.push(addr);
                  return acc;
                }, {} as Record<string, { username: string; addresses: UserAddress[] }>);

                return Object.entries(groupedByUser).map(([userId, data]) => (
                  <div key={userId} className="border rounded-lg p-3 sm:p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{data.username}</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUserAddresses()}
                      >
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    {data.addresses.map((addr) => (
                      <div key={`${userId}-${addr.currency}`} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm bg-muted p-2 rounded gap-1">
                        <span className={`font-medium ${addr.currency === 'BTC' ? 'text-orange-500' : addr.currency === 'LTC' ? 'text-blue-500' : 'text-purple-500'}`}>
                          {addr.currency}:
                        </span>
                        <code className="text-xs break-all">
                          {addr.address === 'pending' ? (
                            <span className="text-yellow-500">Ausstehend</span>
                          ) : (
                            addr.address
                          )}
                        </code>
                      </div>
                    ))}
                  </div>
                ));
              })()}
              {userAddresses.length === 0 && (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  Keine Nutzeradressen gefunden.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

<NewsEditor />

<Card>
          <CardHeader>
            <CardTitle>Kategorie Management</CardTitle>
            <CardDescription>
              Verwalten Sie die verfügbaren Produktkategorien
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor="new-category">Neue Kategorie</Label>
                <Input
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Kategorie Name"
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={addCategory}
                  disabled={isLoading || !newCategory.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Hinzufügen
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Aktuelle Kategorien</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span>{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCategory(category.id, category.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Products Management */}
        <Card>
          <CardHeader>
            <CardTitle>Produktverwaltung</CardTitle>
            <CardDescription>
              Verwalten Sie alle Produkte auf der Plattform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {products.map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Kategorie: {product.category} | Verkäufer: {product.profiles?.username || 'Unbekannt'}
                      </p>
                      <p className="text-lg font-bold text-primary">€{product.price}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: {product.is_active ? 'Aktiv' : 'Inaktiv'}
                      </p>
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
                        <Trash2 className="h-4 w-4 mr-1" />
                        Löschen
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Produkte vorhanden.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Product Modal */}
      <EditProductModal
        product={editingProduct}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onProductUpdated={fetchAllProducts}
      />
    </div>
  );
};

export default AdminPanel;