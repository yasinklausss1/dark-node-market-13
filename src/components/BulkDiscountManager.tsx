import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Percent } from "lucide-react";
interface BulkDiscountManagerProps {
  productId: string;
  productTitle: string;
}
interface BulkDiscount {
  id: string;
  min_quantity: number;
  discount_percentage: number;
  created_at: string;
}
export function BulkDiscountManager({
  productId,
  productTitle
}: BulkDiscountManagerProps) {
  const {
    toast
  } = useToast();
  const [discounts, setDiscounts] = useState<BulkDiscount[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDiscount, setNewDiscount] = useState({
    min_quantity: "",
    discount_percentage: ""
  });
  useEffect(() => {
    fetchDiscounts();
  }, [productId]);
  const fetchDiscounts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('bulk_discounts').select('*').eq('product_id', productId).order('min_quantity', {
        ascending: true
      });
      if (error) throw error;
      setDiscounts(data || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    }
  };
  const addDiscount = async () => {
    const minQty = parseInt(newDiscount.min_quantity);
    const discountPct = parseFloat(newDiscount.discount_percentage);
    if (!minQty || minQty < 1) {
      toast({
        title: "Error",
        description: "Minimum quantity must be at least 1",
        variant: "destructive"
      });
      return;
    }
    if (!discountPct || discountPct <= 0 || discountPct > 100) {
      toast({
        title: "Error",
        description: "Discount percentage must be between 0.01 and 100",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate min_quantity
    if (discounts.some(d => d.min_quantity === minQty)) {
      toast({
        title: "Error",
        description: "A discount for this quantity already exists",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from('bulk_discounts').insert({
        product_id: productId,
        min_quantity: minQty,
        discount_percentage: discountPct
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Bulk discount added successfully"
      });
      setNewDiscount({
        min_quantity: "",
        discount_percentage: ""
      });
      await fetchDiscounts();
    } catch (error) {
      console.error('Error adding discount:', error);
      toast({
        title: "Error",
        description: "Failed to add discount. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const removeDiscount = async (discountId: string) => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from('bulk_discounts').delete().eq('id', discountId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Bulk discount removed successfully"
      });
      await fetchDiscounts();
    } catch (error) {
      console.error('Error removing discount:', error);
      toast({
        title: "Error",
        description: "Failed to remove discount. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <Card>
      
      
    </Card>;
}