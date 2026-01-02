import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Bitcoin, Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface Transaction {
  id: string;
  type: string;
  transaction_direction: string | null;
  amount_eur: number;
  amount_btc: number;
  status: string;
  description: string;
  created_at: string;
  btc_confirmations: number | null;
  from_username: string | null;
  to_username: string | null;
}

export function TransactionHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { btcPrice, ltcPrice } = useCryptoPrices();

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    if (!user) return;

    const channel = supabase
      .channel(`transactions:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTransactions();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaktionsverlauf</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">Wird geladen...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg">Letzte Transaktionen</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">
            Noch keine Transaktionen vorhanden.
          </p>
        ) : (
          <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
            {transactions.map((transaction) => {
              const isIncoming = transaction.transaction_direction === 'incoming' || transaction.type === 'deposit';
              const isOutgoing = transaction.transaction_direction === 'outgoing' || transaction.type === 'purchase';
              
              let cryptoAmount = transaction.amount_btc;
              let cryptoSymbol = 'BTC';
              let IconComponent = Bitcoin;
              let iconColor = 'text-orange-500';
              
              if (transaction.description?.toLowerCase().includes('ltc') || 
                  transaction.description?.toLowerCase().includes('litecoin')) {
                cryptoSymbol = 'LTC';
                IconComponent = Coins;
                iconColor = 'text-blue-500';
              }

              const getStatusLabel = (status: string) => {
                switch (status) {
                  case 'completed': return 'OK';
                  case 'pending': return 'Ausstehend';
                  case 'cancelled': return 'Storniert';
                  case 'failed': return 'Fehler';
                  default: return status;
                }
              };

              const isDisputeRefund =
                transaction.type === 'deposit' &&
                (transaction.description?.toLowerCase().includes('dispute-rückerstattung') ||
                 transaction.description?.toLowerCase().includes('dispute-rueckerstattung') ||
                 transaction.description?.toLowerCase().includes('teilweise dispute-rückerstattung') ||
                 transaction.description?.toLowerCase().includes('teilweise dispute-rueckerstattung'));

              const getTypeLabel = (type: string) => {
                if (isDisputeRefund) return 'Erstattung';
                switch (type) {
                  case 'deposit': return 'Einzahlung';
                  case 'purchase': return 'Kauf';
                  case 'sale': return 'Verkauf';
                  case 'refund': return 'Erstattung';
                  case 'withdrawal': return 'Auszahlung';
                  default: return type;
                }
              };

              return (
                <div 
                  key={transaction.id} 
                  className="border rounded-xl p-2.5 sm:p-3 bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Left Side - Icon and Info */}
                    <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full ${
                        isIncoming ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        {isIncoming ? (
                          <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-medium capitalize text-xs sm:text-sm">
                            {getTypeLabel(transaction.type)}
                          </span>
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs ${
                            transaction.status === 'completed' 
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                              : transaction.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {getStatusLabel(transaction.status)}
                          </span>
                        </div>
                        
                        {transaction.description && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {transaction.description}
                          </p>
                        )}
                        
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                          {format(new Date(transaction.created_at), 'd. MMM HH:mm', { locale: de })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side - Amount */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm sm:text-base font-bold ${
                        isIncoming ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isIncoming ? '+' : '-'}€{transaction.amount_eur.toFixed(2)}
                      </div>
                      
                      {cryptoAmount > 0 && (
                        <div className={`flex items-center gap-0.5 text-[10px] sm:text-xs ${iconColor} justify-end`}>
                          <IconComponent className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span className="font-mono">
                            {cryptoAmount.toFixed(6)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
