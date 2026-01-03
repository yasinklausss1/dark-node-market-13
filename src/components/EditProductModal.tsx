import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit } from 'lucide-react';
import { MultiFileUpload } from '@/components/ui/multi-file-upload';
import { BulkDiscountManager } from '@/components/BulkDiscountManager';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory_id?: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  stock: number;
  product_type?: string;
  digital_content?: string | null;
}

interface EditProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated: () => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ 
  product, 
  open, 
  onOpenChange, 
  onProductUpdated 
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
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

  // Fetch categories and subcategories first, then load product data
  useEffect(() => {
    const init = async () => {
      // Fetch categories
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      setCategories(catData || []);

      // Fetch subcategories
      const { data: subData } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');
      setSubcategories(subData || []);
    };
    
    if (open) {
      init();
    }
  }, [open]);

  // Load product data after modal opens
  useEffect(() => {
    const loadProductData = async () => {
      if (product && open) {
        // Fetch all images for this product
        const { data: images } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', product.id)
          .order('display_order');

        const imageUrls = images?.map(img => img.image_url) || [];
        
        // If no images in product_images table, use the main image_url
        if (imageUrls.length === 0 && product.image_url) {
          imageUrls.push(product.image_url);
        }

        setFormData({
          title: product.title,
          description: product.description || '',
          price: product.price.toString(),
          category: product.category,
          subcategoryId: product.subcategory_id || '',
          imageUrls: imageUrls,
          stock: product.stock.toString(),
          productType: (product.product_type as 'physical' | 'digital') || 'physical',
          digitalContent: product.digital_content || ''
        });
      }
    };

    loadProductData();
  }, [product, open]);

  const getSelectedCategoryId = () => {
    const category = categories.find(c => c.name === formData.category);
    return category?.id || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Validate at least one image is required
    if (formData.imageUrls.length === 0) {
      toast({
        title: "Bild erforderlich",
        description: "Bitte lade mindestens ein Bild hoch.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    // Update product with first image as main image
    const { error } = await supabase
      .from('products')
      .update({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        subcategory_id: formData.subcategoryId && formData.subcategoryId !== 'none' ? formData.subcategoryId : null,
        image_url: formData.imageUrls[0] || null,
        stock: parseInt(formData.stock),
        product_type: formData.productType,
        digital_content: formData.productType === 'digital' ? formData.digitalContent : null
      })
      .eq('id', product.id);

    if (error) {
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Delete existing product images and re-insert
    await supabase
      .from('product_images')
      .delete()
      .eq('product_id', product.id);

    if (formData.imageUrls.length > 0) {
      const imageInserts = formData.imageUrls.map((url, index) => ({
        product_id: product.id,
        image_url: url,
        display_order: index
      }));

      await supabase
        .from('product_images')
        .insert(imageInserts);
    }

    toast({
      title: "Produkt aktualisiert",
      description: "Das Produkt wurde erfolgreich aktualisiert."
    });
    onProductUpdated();
    onOpenChange(false);

    setIsLoading(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>Edit Product</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-productType">Produkttyp</Label>
            <Select 
              value={formData.productType} 
              onValueChange={(value: 'physical' | 'digital') => setFormData({...formData, productType: value})}
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
            <div>
              <Label htmlFor="edit-digitalContent">Digitaler Inhalt (Codes, Links, Text)</Label>
              <Textarea
                id="edit-digitalContent"
                value={formData.digitalContent}
                onChange={(e) => setFormData({...formData, digitalContent: e.target.value})}
                placeholder="Gib hier den Inhalt ein, den der Käufer nach dem Kauf erhält (z.B. Download-Links, Lizenzschlüssel, Codes...)"
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Dieser Inhalt wird dem Käufer nach bestätigter Bestellung angezeigt.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="edit-title">Produktname</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-price">Price (EUR)</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-stock">Stock</Label>
            <Input
              id="edit-stock"
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({...formData, stock: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-category">Kategorie</Label>
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
              <Label htmlFor="edit-subcategory">Unterkategorie (optional)</Label>
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
            <Label htmlFor="edit-imageUrls">Produktbilder</Label>
            <MultiFileUpload
              value={formData.imageUrls}
              onChange={(urls) => setFormData({...formData, imageUrls: urls})}
              minFiles={1}
              maxFiles={10}
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t pt-6">
          <BulkDiscountManager 
            productId={product.id}
            productTitle={product.title}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProductModal;