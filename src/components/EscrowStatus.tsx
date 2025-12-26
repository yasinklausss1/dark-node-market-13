import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle, Clock, RefreshCw, AlertTriangle, Timer } from 'lucide-react';
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

  // Calculate time until dispute can be opened
  const getDisputeAvailableAt = () => {
    const orderDate = new Date(orderCreatedAt);
    const requiredDays = isDigitalProduct ? 2 : 5;
    return new Date(orderDate.getTime() + requiredDays * 24 * 60 * 60 * 1000);
  };

  // State for real-time countdown
  const [timeUntilDispute, setTimeUntilDispute] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    canDispute: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, canDispute: false });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (escrowStatus !== 'held') {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, canDispute: false };
      }

      const now = new Date();
      const disputeAvailableAt = getDisputeAvailableAt();
      const diffMs = disputeAvailableAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, canDispute: true };
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds, canDispute: false };
    };

    // Initial calculation
    setTimeUntilDispute(calculateTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      setTimeUntilDispute(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [escrowStatus, orderCreatedAt, isDigitalProduct]);

  const formatTimeRemaining = () => {
    const { days, hours, minutes, seconds } = timeUntilDispute;
    
    if (days > 0) {
      return `${days}T ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const remainingDays = getRemainingDays();
  const disputeEnabled = timeUntilDispute.canDispute;

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
                {disputeEnabled ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Dispute öffnen
                  </>
                ) : (
                  <>
                    <Timer className="h-4 w-4 mr-2" />
                    <span className="font-mono">{formatTimeRemaining()}</span>
                  </>
                )}
              </Button>
            </div>

            {!disputeEnabled && (
              <p className="text-xs text-muted-foreground">
                Du kannst einen Dispute öffnen, wenn {isDigitalProduct ? '2' : '5'} Tage vergangen sind.
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