import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DisputeModal } from './DisputeModal';

interface EscrowStatusProps {
  orderId: string;
  escrowStatus: string | null;
  autoReleaseAt: string | null;
  buyerConfirmedAt: string | null;
  orderCreatedAt: string;
  isDigitalProduct: boolean;
  onRelease?: () => void;
}

export const EscrowStatus: React.FC<EscrowStatusProps> = ({
  orderId,
  escrowStatus,
  autoReleaseAt,
  buyerConfirmedAt,
  orderCreatedAt,
  isDigitalProduct,
  onRelease
}) => {
  const { toast } = useToast();
  const [releasing, setReleasing] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('release-escrow', {
        body: { orderId, isAutoRelease: false },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Erfolg',
        description: 'Zahlung wurde an den Verkäufer freigegeben'
      });

      onRelease?.();
    } catch (error: any) {
      console.error('Error releasing escrow:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Escrow konnte nicht freigegeben werden',
        variant: 'destructive'
      });
    } finally {
      setReleasing(false);
    }
  };

  // If no escrow status or already released, don't show anything
  if (!escrowStatus || escrowStatus === 'none') {
    return null;
  }

  const getStatusBadge = () => {
    switch (escrowStatus) {
      case 'held':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Shield className="h-3 w-3 mr-1" />
            Im Escrow
          </Badge>
        );
      case 'released':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Freigegeben
          </Badge>
        );
      case 'refunded':
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            Erstattet
          </Badge>
        );
      case 'disputed':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Im Streitfall
          </Badge>
        );
      default:
        return null;
    }
  };

  const getRemainingDays = () => {
    if (!autoReleaseAt) return null;
    const now = new Date();
    const releaseDate = new Date(autoReleaseAt);
    const diffTime = releaseDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate if dispute can be opened
  const canOpenDispute = () => {
    if (escrowStatus !== 'held') return false;
    
    // TEMP: Allow immediate dispute for testing
    return true;
    
    // Original logic:
    // const now = new Date();
    // const orderDate = new Date(orderCreatedAt);
    // const diffTime = now.getTime() - orderDate.getTime();
    // const daysSinceOrder = diffTime / (1000 * 60 * 60 * 24);
    // const requiredDays = isDigitalProduct ? 2 : 6;
    // return daysSinceOrder >= requiredDays;
  };

  const getDaysUntilDispute = () => {
    const now = new Date();
    const orderDate = new Date(orderCreatedAt);
    const diffTime = now.getTime() - orderDate.getTime();
    const daysSinceOrder = diffTime / (1000 * 60 * 60 * 24);
    
    const requiredDays = isDigitalProduct ? 2 : 6;
    return Math.max(0, Math.ceil(requiredDays - daysSinceOrder));
  };

  const remainingDays = getRemainingDays();
  const disputeEnabled = canOpenDispute();
  const daysUntilDispute = getDaysUntilDispute();

  return (
    <>
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Escrow-Status</span>
          </div>
          {getStatusBadge()}
        </div>

        {escrowStatus === 'held' && (
          <>
            {remainingDays !== null && remainingDays > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Auto-Freigabe in {remainingDays} Tag{remainingDays !== 1 ? 'en' : ''}
                  {autoReleaseAt && ` (${new Date(autoReleaseAt).toLocaleDateString('de-DE')})`}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {/* Confirm Receipt Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={releasing}
                  >
                    {releasing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Wird freigegeben...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Erhalt bestätigen
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Erhalt bestätigen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Durch diese Bestätigung wird die Zahlung an den Verkäufer freigegeben. 
                      Stelle sicher, dass du das Produkt/die Dienstleistung erhalten hast und 
                      zufrieden bist, bevor du bestätigst.
                      <br /><br />
                      <strong>Diese Aktion kann nicht rückgängig gemacht werden!</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRelease}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Ja, Erhalt bestätigen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Dispute Button */}
              <Button 
                size="sm" 
                variant="destructive"
                className="flex-1"
                disabled={!disputeEnabled}
                onClick={() => setShowDisputeModal(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {disputeEnabled ? 'Dispute öffnen' : `Dispute in ${daysUntilDispute} Tag${daysUntilDispute !== 1 ? 'en' : ''}`}
              </Button>
            </div>

            {!disputeEnabled && (
              <p className="text-xs text-muted-foreground">
                Du kannst einen Dispute öffnen, wenn du nach {isDigitalProduct ? '2' : '6'} Tagen nichts erhalten hast.
              </p>
            )}
          </>
        )}

        {escrowStatus === 'released' && buyerConfirmedAt && (
          <p className="text-xs text-green-600">
            Bestätigt am {new Date(buyerConfirmedAt).toLocaleString('de-DE')}
          </p>
        )}
      </div>

      <DisputeModal
        open={showDisputeModal}
        onOpenChange={setShowDisputeModal}
        orderId={orderId}
      />
    </>
  );
};