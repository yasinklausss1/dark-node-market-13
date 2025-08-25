import { useState, useEffect } from 'react';

interface CryptoPrices {
  btcPrice: number | null;
  ltcPrice: number | null;
  xmrPrice: number | null;
  loading: boolean;
  error: string | null;
}

// Multiple API sources for better reliability
const API_SOURCES = [
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,monero&vs_currencies=eur&precision=8',
    parseData: (data: any) => ({
      btc: data.bitcoin?.eur,
      ltc: data.litecoin?.eur,
      xmr: data.monero?.eur
    })
  },
  {
    name: 'CoinCap',
    url: 'https://api.coincap.io/v2/assets?ids=bitcoin,litecoin,monero',
    parseData: (data: any) => {
      const assets = data.data;
      const btc = assets.find((a: any) => a.id === 'bitcoin')?.priceUsd;
      const ltc = assets.find((a: any) => a.id === 'litecoin')?.priceUsd;
      const xmr = assets.find((a: any) => a.id === 'monero')?.priceUsd;
      
      // Convert USD to EUR (approximate rate)
      const usdToEur = 0.92; // This should be dynamic in production
      return {
        btc: btc ? parseFloat(btc) * usdToEur : null,
        ltc: ltc ? parseFloat(ltc) * usdToEur : null,
        xmr: xmr ? parseFloat(xmr) * usdToEur : null
      };
    }
  },
  {
    name: 'Binance',
    url: 'https://api.binance.com/api/v3/ticker/price',
    parseData: async (data: any) => {
      try {
        // Get EUR rates from Binance
        const btcEur = data.find((ticker: any) => ticker.symbol === 'BTCEUR')?.price;
        const ltcEur = data.find((ticker: any) => ticker.symbol === 'LTCEUR')?.price;
        // Binance doesn't have direct XMR/EUR, use fallback
        return {
          btc: btcEur ? parseFloat(btcEur) : null,
          ltc: ltcEur ? parseFloat(ltcEur) : null,
          xmr: null // Will use fallback
        };
      } catch {
        return { btc: null, ltc: null, xmr: null };
      }
    }
  }
];

export const useCryptoPrices = (autoRefresh = true): CryptoPrices => {
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [ltcPrice, setLtcPrice] = useState<number | null>(null);
  const [xmrPrice, setXmrPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricesFromSource = async (source: typeof API_SOURCES[0]) => {
    try {
      const response = await fetch(source.url, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`${source.name} API error: ${response.status}`);
      }
      
      const data = await response.json();
      const prices = await source.parseData(data);
      
      return {
        btc: prices.btc && prices.btc > 0 ? prices.btc : null,
        ltc: prices.ltc && prices.ltc > 0 ? prices.ltc : null,
        xmr: prices.xmr && prices.xmr > 0 ? prices.xmr : null,
        source: source.name
      };
    } catch (err) {
      console.warn(`Failed to fetch from ${source.name}:`, err);
      return null;
    }
  };

  const fetchPrices = async () => {
    try {
      setError(null);
      
      let finalPrices = { btc: null, ltc: null, xmr: null };
      let successfulSources = [];
      
      // Try each API source
      for (const source of API_SOURCES) {
        const result = await fetchPricesFromSource(source);
        if (result) {
          successfulSources.push(result.source);
          
          // Use first successful result for each currency
          if (!finalPrices.btc && result.btc) finalPrices.btc = result.btc;
          if (!finalPrices.ltc && result.ltc) finalPrices.ltc = result.ltc;
          if (!finalPrices.xmr && result.xmr) finalPrices.xmr = result.xmr;
          
          // If we have all prices, break early
          if (finalPrices.btc && finalPrices.ltc && finalPrices.xmr) {
            break;
          }
        }
      }
      
      // Set prices if we got any valid data
      if (finalPrices.btc || finalPrices.ltc || finalPrices.xmr) {
        if (finalPrices.btc) setBtcPrice(finalPrices.btc);
        if (finalPrices.ltc) setLtcPrice(finalPrices.ltc);
        if (finalPrices.xmr) setXmrPrice(finalPrices.xmr);
        
        console.log(`Crypto prices updated from: ${successfulSources.join(', ')}`);
      } else {
        throw new Error('All price sources failed');
      }
      
    } catch (err) {
      console.error('Error fetching crypto prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      
      // Set fallback prices to prevent blocking UI
      if (!btcPrice) setBtcPrice(95000); // Conservative fallback
      if (!ltcPrice) setLtcPrice(110);   // Conservative fallback  
      if (!xmrPrice) setXmrPrice(160);   // Conservative fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    
    if (autoRefresh) {
      // Refresh prices every 2 minutes
      const interval = setInterval(fetchPrices, 120000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return { btcPrice, ltcPrice, xmrPrice, loading, error };
};