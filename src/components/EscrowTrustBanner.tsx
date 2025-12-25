import React, { useState } from 'react';
import { Shield, Lock, CheckCircle, Clock, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const EscrowTrustBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('escrow-banner-dismissed') === 'true';
  });

  const handleDismiss = () => {
    sessionStorage.setItem('escrow-banner-dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) {
    return (
      <button
        onClick={() => {
          sessionStorage.removeItem('escrow-banner-dismissed');
          setDismissed(false);
        }}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Shield className="h-4 w-4 text-green-500" />
        <span>Escrow-Schutz Info anzeigen</span>
      </button>
    );
  }

  return (
    <Card className="mb-6 border-green-500/30 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5 overflow-hidden relative">
      {/* Animated shield background */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
        <Shield className="w-full h-full text-green-500" />
      </div>

      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 md:p-3 rounded-full bg-green-500/10 border border-green-500/20 flex-shrink-0">
              <Shield className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-base md:text-lg">
                  Dein Geld ist sicher - Escrow-Schutz
                </h3>
                <Badge variant="outline" className="border-green-500/50 text-green-600 text-xs">
                  100% Sicher
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                Bei jeder Bestellung wird dein Geld in einem sicheren Escrow-System gehalten, 
                bis du die Ware erhalten hast. <strong className="text-green-600">Wenn etwas schiefgeht, bekommst du dein Geld zurück!</strong>
              </p>

              {/* Collapsible details */}
              <div className={`mt-4 space-y-4 overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {/* How it works */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50 border border-border">
                    <div className="p-1.5 rounded-full bg-blue-500/10">
                      <Lock className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">1. Geld gesichert</p>
                      <p className="text-xs text-muted-foreground">
                        Deine Zahlung wird sicher aufbewahrt
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50 border border-border">
                    <div className="p-1.5 rounded-full bg-orange-500/10">
                      <Clock className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">2. Lieferung prüfen</p>
                      <p className="text-xs text-muted-foreground">
                        Du hast Zeit, die Ware zu prüfen
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50 border border-border">
                    <div className="p-1.5 rounded-full bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">3. Bestätigung</p>
                      <p className="text-xs text-muted-foreground">
                        Erst dann erhält der Verkäufer das Geld
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional info */}
                <div className="p-3 rounded-lg bg-background/50 border border-border">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        <strong className="text-foreground">Bei Problemen:</strong> Du kannst jederzeit einen Dispute eröffnen 
                        und unser Team prüft den Fall neutral.
                      </p>
                      <p>
                        <strong className="text-foreground">Automatische Freigabe:</strong> Nach einer Frist wird das Geld 
                        automatisch freigegeben, wenn du nicht reagierst - du hast also immer genug Zeit.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expand/Collapse button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-muted-foreground hover:text-foreground h-8 px-2"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Weniger anzeigen
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Wie funktioniert Escrow?
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
