import axios from "axios";
import { getCacheKey, cachedRequest } from "./cache";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

const TOKEN_IDS = {
  neo: "neo",
  gas: "gas-network-token",
};

const CACHE_TTL = {
  price: 60 * 1000,
  chart: 5 * 60 * 1000,
};

const coinGeckoApi = axios.create({
  baseURL: COINGECKO_API,
  timeout: 10000,
});

coinGeckoApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.warn("CoinGecko API error:", error.message);
    }
    return Promise.reject(error);
  }
);

export async function getTokenPrices(
  tokens = ["neo", "gas"],
  currency = "usd"
) {
  const key = getCacheKey("token_prices", {
    tokens: tokens.join(","),
    currency,
  });

  return cachedRequest(
    key,
    async () => {
      try {
        const ids = tokens.map((t) => TOKEN_IDS[t] || t).join(",");
        const response = await coinGeckoApi.get("/simple/price", {
          params: {
            ids,
            vs_currencies: currency,
            include_24hr_change: true,
          },
        });

        const result = {};
        for (const token of tokens) {
          const id = TOKEN_IDS[token] || token;
          const data = response.data[id];
          if (data) {
            result[token] = {
              price: data[currency],
              change24h: data[`${currency}_24h_change`] || 0,
            };
          }
        }
        return result;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Failed to fetch token prices:", error.message);
        }
        return {
          neo: { price: 0, change24h: 0 },
          gas: { price: 0, change24h: 0 },
        };
      }
    },
    CACHE_TTL.price
  );
}

export async function getTokenChart(tokenId, currency = "usd", days = 7) {
  const id = TOKEN_IDS[tokenId] || tokenId;
  const key = getCacheKey("token_chart", { id, currency, days });

  return cachedRequest(
    key,
    async () => {
      try {
        const response = await coinGeckoApi.get(`/coins/${id}/market_chart`, {
          params: {
            vs_currency: currency,
            days,
          },
        });

        return {
          prices: response.data.prices || [],
          market_caps: response.data.market_caps || [],
          volumes: response.data.total_volumes || [],
        };
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Failed to fetch token chart:", error.message);
        }
        return { prices: [], market_caps: [], volumes: [] };
      }
    },
    CACHE_TTL.chart
  );
}

export async function getTokenMarketData(tokenId, currency = "usd") {
  const id = TOKEN_IDS[tokenId] || tokenId;
  const key = getCacheKey("token_market", { id, currency });

  return cachedRequest(
    key,
    async () => {
      try {
        const response = await coinGeckoApi.get("/coins/markets", {
          params: {
            vs_currency: currency,
            ids: id,
            order: "market_cap_desc",
            per_page: 1,
            page: 1,
            sparkline: false,
            price_change_percentage: "24h,7d",
          },
        });

        if (response.data && response.data.length > 0) {
          return response.data[0];
        }
        return null;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Failed to fetch market data:", error.message);
        }
        return null;
      }
    },
    CACHE_TTL.price
  );
}

export function formatPriceChange(change) {
  if (!change && change !== 0) return "0.00%";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

export function formatPrice(price, currency = "usd") {
  if (!price) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  }).format(price);
}

export default {
  getTokenPrices,
  getTokenChart,
  getTokenMarketData,
  formatPriceChange,
  formatPrice,
};
