import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface ProductAddon {
  id: string;
  name: string;
  price_eur: number;
  is_required: boolean;
}
interface ProductAddonManagerProps {
  productId: string;
}
export const ProductAddonManager = ({
  productId
}: ProductAddonManagerProps) => {
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  const [newAddon, setNewAddon] = useState({
    name: "",
    price_eur: 0,
    is_required: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchAddons();
  }, [productId]);
  const fetchAddons = async () => {
    const {
      data,
      error
    } = await supabase.from("product_addons").select("*").eq("product_id", productId).order("created_at", {
      ascending: true
    });
    if (error) {
      console.error("Error fetching addons:", error);
    } else {
      setAddons(data || []);
    }
  };
  const handleAddAddon = async () => {
    if (!newAddon.name.trim()) {
      toast({
        title: "Please enter add-on name",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await supabase.from("product_addons").insert({
      product_id: productId,
      name: newAddon.name,
      price_eur: newAddon.price_eur,
      is_required: newAddon.is_required
    });
    if (error) {
      toast({
        title: "Error adding add-on",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Add-on added"
      });
      setNewAddon({
        name: "",
        price_eur: 0,
        is_required: false
      });
      fetchAddons();
    }
    setIsLoading(false);
  };
  const handleDeleteAddon = async (addonId: string) => {
    const {
      error
    } = await supabase.from("product_addons").delete().eq("id", addonId);
    if (error) {
      toast({
        title: "Error deleting add-on",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Add-on deleted"
      });
      fetchAddons();
    }
  };
  return <div className="space-y-4">
      <h3 className="text-lg font-semibold">Product Add-ons</h3>
      
      {/* Existing addons */}
      <div className="space-y-2">
        {addons.map(addon => <div key={addon.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{addon.name}</div>
              <div className="text-sm text-muted-foreground">
                +€{addon.price_eur.toFixed(2)} {addon.is_required && "(Required)"}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteAddon(addon.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>)}
      </div>

      {/* Add new addon */}
      <div className="space-y-3 p-4 border rounded-lg">
        <h4 className="font-medium">New Add-On </h4>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input placeholder="e.g. Add weapon, ammunition type" value={newAddon.name} onChange={e => setNewAddon({
          ...newAddon,
          name: e.target.value
        })} />
        </div>
        <div className="space-y-2">
          <Label>Price (EUR)</Label>
          <Input type="number" step="0.01" min="0" placeholder="0.00" value={newAddon.price_eur} onChange={e => setNewAddon({
          ...newAddon,
          price_eur: parseFloat(e.target.value) || 0
        })} />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="is-required" checked={newAddon.is_required} onCheckedChange={checked => setNewAddon({
          ...newAddon,
          is_required: checked as boolean
        })} />
          <Label htmlFor="is-required" className="cursor-pointer">
            Required (at least one option must be selected)
          </Label>
        </div>
        <Button onClick={handleAddAddon} disabled={isLoading} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Add-on
        </Button>
      </div>
    </div>;
};