import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
interface ProductAddon {
  id: string;
  name: string;
  price_eur: number;
  is_required: boolean;
}
export interface AddonSelection {
  addonId: string;
  addonName: string;
  priceEur: number;
  customValue?: string;
}
interface ProductAddonsSelectionProps {
  productId: string;
  onSelectionsChange: (selections: AddonSelection[], totalPrice: number) => void;
}
export const ProductAddonsSelection = ({
  productId,
  onSelectionsChange
}: ProductAddonsSelectionProps) => {
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  const [selections, setSelections] = useState<Map<string, AddonSelection>>(new Map());
  const [customName, setCustomName] = useState("");
  const [useUsername, setUseUsername] = useState(true);
  const [additionalNotes, setAdditionalNotes] = useState("");
  useEffect(() => {
    fetchAddons();
  }, [productId]);
  useEffect(() => {
    const selectionsArray = Array.from(selections.values());
    const totalPrice = selectionsArray.reduce((sum, sel) => sum + sel.priceEur, 0);
    onSelectionsChange(selectionsArray, totalPrice);
  }, [selections]);
  const fetchAddons = async () => {
    const {
      data,
      error
    } = await supabase.from("product_addons").select("*").eq("product_id", productId).order("created_at", {
      ascending: true
    });
    if (!error && data) {
      setAddons(data);
    }
  };
  const toggleAddon = (addon: ProductAddon, checked: boolean) => {
    const newSelections = new Map(selections);
    if (checked) {
      newSelections.set(addon.id, {
        addonId: addon.id,
        addonName: addon.name,
        priceEur: addon.price_eur
      });
    } else {
      newSelections.delete(addon.id);
    }
    setSelections(newSelections);
  };
  if (addons.length === 0) return null;
  return <div className="space-y-6 p-4 border rounded-lg bg-card">
      <h3 className="font-semibold text-lg">Add-Ons</h3>

      {/* Custom Name Input */}
      <div className="space-y-3">
        <Label className="text-base">Name für dieses Produkt:</Label>
        <RadioGroup value={useUsername ? "username" : "custom"} onValueChange={v => setUseUsername(v === "username")}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="username" id="use-username" />
            <Label htmlFor="use-username" className="cursor-pointer font-normal">
              Meinen Benutzernamen verwenden
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom-name" />
            <Label htmlFor="custom-name" className="cursor-pointer font-normal">
              Eigenen Namen eingeben
            </Label>
          </div>
        </RadioGroup>
        {!useUsername && <Input placeholder="Geben Sie einen benutzerdefinierten Namen ein" value={customName} onChange={e => setCustomName(e.target.value)} />}
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label>Zusätzliche Hinweise</Label>
        <Textarea placeholder="Besondere Wünsche oder Anmerkungen..." value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} rows={3} />
      </div>

      {/* Add-ons */}
      <div className="space-y-4">
        {addons.map(addon => <div key={addon.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox id={addon.id} checked={selections.has(addon.id)} onCheckedChange={checked => toggleAddon(addon, checked as boolean)} />
            <div className="flex-1">
              <Label htmlFor={addon.id} className="cursor-pointer flex items-center justify-between">
                <span>
                  {addon.name} {addon.is_required && <span className="text-destructive">**ERFORDERLICH**</span>}
                </span>
                <span className="text-sm font-medium">
                  {addon.price_eur > 0 ? `+€${addon.price_eur.toFixed(2)}` : '(+0 credits)'}
                </span>
              </Label>
            </div>
          </div>)}
      </div>
    </div>;
};