import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ForumCategory } from '@/hooks/useForum';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Link as LinkIcon } from 'lucide-react';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ForumCategory[];
  defaultCategoryId?: string;
  onSubmit: (data: {
    category_id: string;
    title: string;
    content: string;
    flair?: string;
    linked_product_id?: string;
  }) => Promise<any>;
}

interface Product {
  id: string;
  title: string;
  price: number;
}

const FLAIRS = ['Frage', 'Diskussion', 'Guide', 'Review', 'News', 'Deal', 'Feedback'];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  open,
  onOpenChange,
  categories,
  defaultCategoryId,
  onSubmit
}) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [flair, setFlair] = useState('');
  const [linkedProductId, setLinkedProductId] = useState('');
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [showProductLink, setShowProductLink] = useState(false);

  useEffect(() => {
    if (open && user && (profile?.role === 'seller' || profile?.role === 'admin')) {
      fetchUserProducts();
    }
  }, [open, user, profile]);

  const fetchUserProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('products')
      .select('id, title, price')
      .eq('seller_id', user.id)
      .eq('is_active', true)
      .limit(50);
    
    if (data) {
      setUserProducts(data);
    }
  };

  const handleSubmit = async () => {
    if (!categoryId || !title.trim() || !content.trim()) return;

    setLoading(true);
    const result = await onSubmit({
      category_id: categoryId,
      title: title.trim(),
      content: content.trim(),
      flair: flair || undefined,
      linked_product_id: linkedProductId || undefined
    });

    if (result) {
      setTitle('');
      setContent('');
      setFlair('');
      setLinkedProductId('');
      onOpenChange(false);
    }
    setLoading(false);
  };

  const canLinkProduct = profile?.role === 'seller' || profile?.role === 'admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Neuen Post erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>Kategorie *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Wähle eine Kategorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Titel *</Label>
            <Input
              placeholder="Ein interessanter Titel..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/300
            </p>
          </div>

          {/* Flair */}
          <div className="space-y-2">
            <Label>Flair (optional)</Label>
            <Select value={flair} onValueChange={setFlair}>
              <SelectTrigger>
                <SelectValue placeholder="Kein Flair" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Kein Flair</SelectItem>
                {FLAIRS.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label>Inhalt *</Label>
            <Textarea
              placeholder="Was möchtest du teilen?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px]"
            />
          </div>

          {/* Link Product */}
          {canLinkProduct && (
            <div className="space-y-2">
              {!showProductLink ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductLink(true)}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Produkt verlinken
                </Button>
              ) : (
                <>
                  <Label>Produkt verlinken (optional)</Label>
                  <Select value={linkedProductId} onValueChange={setLinkedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kein Produkt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Kein Produkt</SelectItem>
                      {userProducts.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.title} - {product.price}€
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !categoryId || !title.trim() || !content.trim()}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Posten
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
