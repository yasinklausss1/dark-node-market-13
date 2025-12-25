import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { OrderImageUpload } from '@/components/ui/order-image-upload';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ShoppingCart, Shield, ShieldCheck, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const checkoutSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  street: z.string().min(1, 'Straße ist erforderlich'),
  houseNumber: z.string().min(1, 'Hausnummer ist erforderlich'),
  postalCode: z.string().min(1, 'Postleitzahl ist erforderlich'),
  city: z.string().min(1, 'Stadt ist erforderlich'),
  country: z.string().min(1, 'Land ist erforderlich'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirmOrder: (address: CheckoutFormData | null, buyerNotes?: string, buyerNotesImages?: string[], useEscrow?: boolean) => void;
  loading?: boolean;
  requiresShipping?: boolean;
}

const countries = [
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'CH', label: 'Schweiz' },
  { value: 'FR', label: 'Frankreich' },
  { value: 'IT', label: 'Italien' },
  { value: 'NL', label: 'Niederlande' },
  { value: 'BE', label: 'Belgien' },
  { value: 'ES', label: 'Spanien' },
  { value: 'PT', label: 'Portugal' },
  { value: 'GB', label: 'Vereinigtes Königreich' },
  { value: 'IE', label: 'Irland' },
  { value: 'PL', label: 'Polen' },
  { value: 'CZ', label: 'Tschechien' },
  { value: 'HU', label: 'Ungarn' },
  { value: 'SK', label: 'Slowakei' },
  { value: 'SI', label: 'Slowenien' },
  { value: 'HR', label: 'Kroatien' },
  { value: 'SE', label: 'Schweden' },
  { value: 'NO', label: 'Norwegen' },
  { value: 'DK', label: 'Dänemark' },
  { value: 'FI', label: 'Finnland' },
  { value: 'RO', label: 'Rumänien' },
  { value: 'BG', label: 'Bulgarien' },
  { value: 'GR', label: 'Griechenland' },
  { value: 'TR', label: 'Türkei' },
  { value: 'RU', label: 'Russland' },
  { value: 'UA', label: 'Ukraine' },
  // Asien
  { value: 'CN', label: 'China' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'Südkorea' },
  { value: 'SG', label: 'Singapur' },
  { value: 'HK', label: 'Hongkong' },
  { value: 'TW', label: 'Taiwan' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'TH', label: 'Thailand' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'PH', label: 'Philippinen' },
  { value: 'ID', label: 'Indonesien' },
  { value: 'IN', label: 'Indien' },
  { value: 'AE', label: 'Vereinigte Arabische Emirate' },
  { value: 'SA', label: 'Saudi-Arabien' },
  { value: 'QA', label: 'Katar' },
  { value: 'IL', label: 'Israel' },
];

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onOpenChange,
  totalAmount,
  onConfirmOrder,
  loading = false,
  requiresShipping = true
}) => {
  const [buyerNotes, setBuyerNotes] = useState('');
  const [buyerNotesImages, setBuyerNotesImages] = useState<string[]>([]);
  const [useEscrow, setUseEscrow] = useState(true); // Default to escrow enabled
  
  const form = useForm<CheckoutFormData>({
    resolver: requiresShipping ? zodResolver(checkoutSchema) : undefined,
    defaultValues: {
      firstName: '',
      lastName: '',
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      country: '',
    },
  });

  const onSubmit = (data: CheckoutFormData) => {
    onConfirmOrder(requiresShipping ? data : null, undefined, undefined, useEscrow);
  };

  // For digital products, confirm with buyer notes and images
  const handleDigitalConfirm = () => {
    onConfirmOrder(null, buyerNotes.trim() || undefined, buyerNotesImages.length > 0 ? buyerNotesImages : undefined, useEscrow);
    setBuyerNotes('');
    setBuyerNotesImages([]);
  };

  // Escrow selection component
  const EscrowSelection = () => (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {useEscrow ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
          <Label htmlFor="escrow-toggle" className="font-medium cursor-pointer">
            Escrow-Schutz aktivieren
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Mit Escrow wird dein Geld sicher verwahrt, bis du die Ware erhalten hast. Wenn etwas schiefgeht, bekommst du dein Geld zurück.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id="escrow-toggle"
          checked={useEscrow}
          onCheckedChange={setUseEscrow}
        />
      </div>
      
      {useEscrow ? (
        <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-3 rounded-md">
          <p className="font-medium">✓ Käuferschutz aktiv</p>
          <p className="text-xs mt-1 text-green-600/80 dark:text-green-400/80">
            Dein Geld wird sicher verwahrt und erst nach Bestätigung des Erhalts an den Verkäufer freigegeben. 
            Bei Problemen erhältst du eine volle Rückerstattung.
          </p>
        </div>
      ) : (
        <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
          <p className="font-medium">⚠ Kein Käuferschutz</p>
          <p className="text-xs mt-1 text-amber-600/80 dark:text-amber-400/80">
            Bei Direktzahlung ohne Escrow erfolgt die Zahlung sofort an den Verkäufer. 
            Du trägst das Risiko, falls etwas schiefgeht.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <span>Bestellung abschließen</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-lg font-semibold">Gesamtbetrag: €{totalAmount.toFixed(2)}</p>
          </div>

        {requiresShipping ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Escrow Selection */}
                <EscrowSelection />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nachname</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Straße</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="houseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nr.</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PLZ</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stadt</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Land</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Land auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 flex items-center gap-2"
                    disabled={loading}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Zurück
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Wird verarbeitet...' : 'Bestellung aufgeben'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              {/* Escrow Selection for digital products */}
              <EscrowSelection />

              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-center font-medium text-amber-800 dark:text-amber-200 mb-2">
                  ⚠️ Kaufbestätigung
                </p>
                <p className="text-sm text-center text-amber-700 dark:text-amber-300">
                  Möchtest du dieses digitale Produkt wirklich kaufen?
                </p>
                <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2">
                  Der Betrag wird sofort von deinem Guthaben abgebucht. Nach dem Kauf erhältst du den digitalen Inhalt in deinen Bestellungen.
                </p>
              </div>
              
              {/* Buyer notes for digital products */}
              <div className="space-y-2">
                <Label htmlFor="buyer-notes">Hinweise an den Verkäufer (optional)</Label>
                <Textarea
                  id="buyer-notes"
                  placeholder="z.B. gewünschter Benutzername, E-Mail-Adresse, spezielle Wünsche..."
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Diese Nachricht wird dem Verkäufer bei der Bestellung angezeigt.
                </p>
              </div>
              
              {/* Image upload for buyer */}
              <div className="space-y-2">
                <Label>Bilder anhängen (optional)</Label>
                <OrderImageUpload
                  images={buyerNotesImages}
                  onChange={setBuyerNotesImages}
                  maxImages={5}
                />
                <p className="text-xs text-muted-foreground">
                  z.B. Screenshots, Referenzbilder oder andere relevante Bilder
                </p>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    setBuyerNotes('');
                    setBuyerNotesImages([]);
                  }}
                  className="flex-1 flex items-center gap-2"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Abbrechen
                </Button>
                <Button
                  onClick={handleDigitalConfirm}
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Wird verarbeitet...' : 'Ja, jetzt kaufen'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
