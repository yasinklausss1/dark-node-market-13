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
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  stock: number;
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    imageUrls: [] as string[],
    stock: ''
  });

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
          imageUrls: imageUrls,
          stock: product.stock.toString()
        });
      }
    };

    loadProductData();
  }, [product, open]);

  useEffect(() => {
    fetchCategories();
  }, []);

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
        image_url: formData.imageUrls[0] || null,
        stock: parseInt(formData.stock)
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
            <Label htmlFor="edit-title">Product Name</Label>
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
            <Label htmlFor="edit-category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({...formData, category: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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