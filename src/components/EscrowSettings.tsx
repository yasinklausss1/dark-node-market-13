import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, RefreshCw, Shield, Clock, Percent } from 'lucide-react';

interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
}

interface EscrowHolding {
  id: string;
  order_id: string;
  seller_id: string;
  buyer_id: string;
  amount_eur: number;
  amount_crypto: number;
  currency: string;
  status: string;
  auto_release_at: string;
  created_at: string;
}

export const EscrowSettings: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [holdings, setHoldings] = useState<EscrowHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState({
    escrow_fee_percent: '1',
    auto_release_days_digital: '7',
    auto_release_days_physical: '14'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('platform_settings')
        .select('*');

      if (settingsError) throw settingsError;
      setSettings(settingsData || []);

      // Update form values from settings
      const newFormValues = { ...formValues };
      settingsData?.forEach(s => {
        if (s.setting_key in newFormValues) {
          newFormValues[s.setting_key as keyof typeof newFormValues] = s.setting_value;
        }
      });
      setFormValues(newFormValues);

      // Fetch active escrow holdings
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('escrow_holdings')
        .select('*')
        .eq('status', 'held')
        .order('created_at', { ascending: false });

      if (holdingsError) throw holdingsError;
      setHoldings(holdingsData || []);

    } catch (error: any) {
      console.error('Error fetching escrow data:', error);
      toast({
        title: 'Fehler',
        description: 'Escrow-Daten konnten nicht geladen werden',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(formValues)) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ setting_value: value })
          .eq('setting_key', key);

        if (error) throw error;
      }

      toast({
        title: 'Erfolg',
        description: 'Escrow-Einstellungen wurden gespeichert'
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Fehler',
        description: 'Einstellungen konnten nicht gespeichert werden',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const totalHeldEur = holdings.reduce((sum, h) => sum + Number(h.amount_eur), 0);
  const totalHeldBtc = holdings.filter(h => h.currency === 'BTC').reduce((sum, h) => sum + Number(h.amount_crypto), 0);
  const totalHeldLtc = holdings.filter(h => h.currency === 'LTC').reduce((sum, h) => sum + Number(h.amount_crypto), 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Escrow-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Settings */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Escrow-Einstellungen
              </CardTitle>
              <CardDescription>
                Konfiguriere Gebühren und Auto-Release Zeiten
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Gebühr (%)
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formValues.escrow_fee_percent}
                onChange={(e) => setFormValues({ ...formValues, escrow_fee_percent: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Prozentsatz der an dich geht
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Auto-Release Digital (Tage)
              </Label>
              <Input
                type="number"
                min="1"
                max="90"
                value={formValues.auto_release_days_digital}
                onChange={(e) => setFormValues({ ...formValues, auto_release_days_digital: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Für digitale Produkte
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Auto-Release Physisch (Tage)
              </Label>
              <Input
                type="number"
                min="1"
                max="90"
                value={formValues.auto_release_days_physical}
                onChange={(e) => setFormValues({ ...formValues, auto_release_days_physical: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Für physische Produkte
              </p>
            </div>
          </div>
          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Speichere...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Einstellungen speichern
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Active Holdings Overview */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-blue-500" />
            Aktive Escrow-Holdings
          </CardTitle>
          <CardDescription>
            Aktuell im Escrow gehaltene Beträge
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Gesamt EUR</p>
              <p className="text-2xl font-bold text-primary">€{totalHeldEur.toFixed(2)}</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Gesamt BTC</p>
              <p className="text-2xl font-bold text-orange-500">{totalHeldBtc.toFixed(8)}</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Gesamt LTC</p>
              <p className="text-2xl font-bold text-slate-500">{totalHeldLtc.toFixed(8)}</p>
            </div>
          </div>

          {holdings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Keine aktiven Escrow-Holdings
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {holdings.map((holding) => (
                <div 
                  key={holding.id} 
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium">
                      Order #{holding.order_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Auto-Release: {new Date(holding.auto_release_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">
                      {Number(holding.amount_crypto).toFixed(8)} {holding.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      €{Number(holding.amount_eur).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};