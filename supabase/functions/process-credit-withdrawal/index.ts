import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawalRequest {
  credits_amount: number;
  crypto_currency: 'BTC' | 'LTC';
  destination_address: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { credits_amount, crypto_currency, destination_address }: WithdrawalRequest = await req.json();

    // Validate input
    if (!credits_amount || credits_amount <= 0) {
      throw new Error('Ungültige Credits-Menge');
    }

    if (!['BTC', 'LTC'].includes(crypto_currency)) {
      throw new Error('Ungültige Kryptowährung');
    }

    if (!destination_address) {
      throw new Error('Zieladresse erforderlich');
    }

    // Check user balance
    const { data: balance, error: balanceError } = await supabase
      .from('wallet_balances')
      .select('balance_credits')
      .eq('user_id', user.id)
      .single();

    if (balanceError || !balance) {
      throw new Error('Wallet nicht gefunden');
    }

    if (balance.balance_credits < credits_amount) {
      throw new Error('Nicht genug Credits');
    }

    // Calculate amounts
    const eurAmount = credits_amount; // 1 credit = 1 EUR
    const platformFeePercent = 5;
    const feeEur = eurAmount * (platformFeePercent / 100);
    const eurAfterFee = eurAmount - feeEur;

    // Get crypto prices from CoinGecko
    const priceResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin&vs_currencies=eur'
    );
    
    if (!priceResponse.ok) {
      throw new Error('Konnte Krypto-Preise nicht abrufen');
    }

    const prices = await priceResponse.json();
    const cryptoPrice = crypto_currency === 'BTC' 
      ? prices.bitcoin.eur 
      : prices.litecoin.eur;

    const cryptoAmount = eurAfterFee / cryptoPrice;

    console.log('Withdrawal calculation:', {
      credits: credits_amount,
      eur: eurAmount,
      fee: feeEur,
      eurAfterFee,
      cryptoPrice,
      cryptoAmount,
    });

    // Deduct credits from user balance
    const { error: updateBalanceError } = await supabase
      .from('wallet_balances')
      .update({ 
        balance_credits: balance.balance_credits - credits_amount 
      })
      .eq('user_id', user.id);

    if (updateBalanceError) {
      throw new Error('Fehler beim Aktualisieren des Guthabens');
    }

    // Create withdrawal record
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('credit_withdrawals')
      .insert({
        user_id: user.id,
        credits_amount,
        eur_amount: eurAmount,
        crypto_currency,
        crypto_amount: cryptoAmount,
        destination_address,
        fee_eur: feeEur,
        status: 'pending',
      })
      .select()
      .single();

    if (withdrawalError) {
      // Refund credits on error
      await supabase
        .from('wallet_balances')
        .update({ 
          balance_credits: balance.balance_credits 
        })
        .eq('user_id', user.id);

      throw new Error('Fehler beim Erstellen der Auszahlung');
    }

    // Record transaction
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: -credits_amount,
      type: 'withdrawal',
      description: `Auszahlung zu ${crypto_currency}: ${cryptoAmount.toFixed(8)} ${crypto_currency}`,
    });

    console.log('Withdrawal created successfully:', withdrawal.id);

    // Process the actual crypto transaction asynchronously
    // In production, this would call CryptoAPIs or similar service
    // For now, we'll just mark it as processing
    await supabase
      .from('credit_withdrawals')
      .update({ status: 'processing' })
      .eq('id', withdrawal.id);

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_id: withdrawal.id,
        crypto_amount: cryptoAmount,
        message: 'Auszahlung erfolgreich beantragt',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
