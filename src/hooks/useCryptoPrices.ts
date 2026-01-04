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

// Global cache to prevent multiple fetches
let priceCache: { btc: number | null; ltc: number | null; xmr: number | null; timestamp: number } | null = null;
let fetchPromise: Promise<void> | null = null;

export const useCryptoPrices = (autoRefresh = true): CryptoPrices => {
  const [prices, setPrices] = useState<{ btc: number | null; ltc: number | null; xmr: number | null }>({
    btc: priceCache?.btc ?? null,
    ltc: priceCache?.ltc ?? null,
    xmr: priceCache?.xmr ?? null
  });
  const [loading, setLoading] = useState(!priceCache);
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
      const parsedPrices = await source.parseData(data);
      
      return {
        btc: parsedPrices.btc && parsedPrices.btc > 0 ? parsedPrices.btc : null,
        ltc: parsedPrices.ltc && parsedPrices.ltc > 0 ? parsedPrices.ltc : null,
        xmr: parsedPrices.xmr && parsedPrices.xmr > 0 ? parsedPrices.xmr : null,
        source: source.name
      };
    } catch (err) {
      console.warn(`Failed to fetch from ${source.name}:`, err);
      return null;
    }
  };

  const fetchPrices = async () => {
    // Use cache if fresh (< 30 seconds)
    if (priceCache && Date.now() - priceCache.timestamp < 30000) {
      setPrices({ btc: priceCache.btc, ltc: priceCache.ltc, xmr: priceCache.xmr });
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchPromise) {
      await fetchPromise;
      if (priceCache) {
        setPrices({ btc: priceCache.btc, ltc: priceCache.ltc, xmr: priceCache.xmr });
        setLoading(false);
      }
      return;
    }

    fetchPromise = (async () => {
      try {
        setError(null);
        
        let finalPrices = { btc: null as number | null, ltc: null as number | null, xmr: null as number | null };
        let successSource = '';
        
        // Try each API source
        for (const source of API_SOURCES) {
          const result = await fetchPricesFromSource(source);
          if (result) {
            if (!finalPrices.btc && result.btc) finalPrices.btc = result.btc;
            if (!finalPrices.ltc && result.ltc) finalPrices.ltc = result.ltc;
            if (!finalPrices.xmr && result.xmr) finalPrices.xmr = result.xmr;
            
            if (!successSource) successSource = result.source;
            
            if (finalPrices.btc && finalPrices.ltc) {
              break;
            }
          }
        }
        
        if (finalPrices.btc || finalPrices.ltc || finalPrices.xmr) {
          priceCache = { ...finalPrices, timestamp: Date.now() };
          setPrices(finalPrices);
          console.log(`Crypto prices updated from: ${successSource}`);
        } else {
          throw new Error('All price sources failed');
        }
        
      } catch (err) {
        console.error('Error fetching crypto prices:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch prices');
        
        // Set fallback prices
        const fallback = { btc: 95000, ltc: 110, xmr: 160 };
        priceCache = { ...fallback, timestamp: Date.now() };
        setPrices(fallback);
      } finally {
        setLoading(false);
        fetchPromise = null;
      }
    })();

    await fetchPromise;
  };

  useEffect(() => {
    fetchPrices();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPrices, 120000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return { btcPrice: prices.btc, ltcPrice: prices.ltc, xmrPrice: prices.xmr, loading, error };
};