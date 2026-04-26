import { safeRedisGet, safeRedisSetEx } from '../../config/redis';

/**
 * CurrencyService
 *
 * Handles exchange rate lookups and currency conversion.
 * 
 * Architecture decision: We cache rates in-memory for the duration of the
 * process (1-hour TTL) to avoid hammering the free-tier API on every request.
 * For a production deployment, this would move to a Redis cache layer.
 *
 * Rates are fetched from the free Open Exchange Rates compatible endpoint
 * (exchangerate-api.com free tier, no key required for latest/USD base).
 * If the fetch fails, we fall back to 1.0 (same-currency) to avoid blocking
 * expense creation.
 */

async function fetchRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { rates: Record<string, number> };
    return data.rates;
  } catch (err) {
    console.warn('[CurrencyService] Failed to fetch exchange rates:', err);
    return {};
  }
}

async function getRates(): Promise<Record<string, number>> {
  const cacheKey = 'exchange_rates:latest';
  const cached = await safeRedisGet(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.warn('[CurrencyService] Failed to parse cached exchange rates');
    }
  }

  const rates = await fetchRates();
  if (Object.keys(rates).length > 0) {
    await safeRedisSetEx(cacheKey, 3600, JSON.stringify(rates));
  }
  return rates;
}

/**
 * Get the exchange rate FROM `fromCurrency` TO `toCurrency`.
 * Returns how many units of `toCurrency` 1 unit of `fromCurrency` equals.
 * 
 * Falls back to 1.0 if rate is unavailable (same-currency assumption).
 */
export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1.0;

  const rates = await getRates();

  if (Object.keys(rates).length === 0) {
    console.warn(`[CurrencyService] No rates available, defaulting to 1.0 for ${fromCurrency} -> ${toCurrency}`);
    return 1.0;
  }

  // rates are all vs USD, so:
  // fromCurrency -> USD -> toCurrency
  const fromRate = rates[fromCurrency]; // 1 USD = fromRate fromCurrency
  const toRate = rates[toCurrency];     // 1 USD = toRate toCurrency

  if (!fromRate || !toRate) {
    console.warn(`[CurrencyService] Missing rate for ${fromCurrency} or ${toCurrency}, defaulting to 1.0`);
    return 1.0;
  }

  // 1 fromCurrency = (1/fromRate) USD = (toRate/fromRate) toCurrency
  return toRate / fromRate;
}

/**
 * Convert an amount from one currency to another.
 */
export async function convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return Math.round(amount * rate * 100) / 100;
}

/**
 * For display: format a number as a currency string.
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
