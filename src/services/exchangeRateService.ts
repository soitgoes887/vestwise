// Exchange rate service using exchangerate-api.com (free, no API key needed)
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

export interface ExchangeRateData {
  rate: number;
  lastUpdated: Date;
}

export async function fetchUsdToGbpRate(): Promise<ExchangeRateData> {
  try {
    const response = await fetch(EXCHANGE_API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // API returns USD to GBP (e.g., 1 USD = 0.79 GBP)
    // Calculator needs GBP to USD (e.g., 1 GBP = 1.27 USD)
    // So we invert: 1 / 0.79 = 1.27
    return {
      rate: Math.round((1 / data.rates.GBP) * 100) / 100, // Round to 2 decimals
      lastUpdated: new Date(data.time_last_updated * 1000)
    };
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    throw error;
  }
}

// Alternative: Use European Central Bank (ECB) API (no API key, official source)
export async function fetchUsdToGbpRateECB(): Promise<ExchangeRateData> {
  try {
    // ECB provides EUR rates, so we need to calculate USD/GBP
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=GBP');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // API returns USD to GBP (e.g., 1 USD = 0.79 GBP)
    // Calculator needs GBP to USD (e.g., 1 GBP = 1.27 USD)
    // So we invert: 1 / 0.79 = 1.27
    return {
      rate: Math.round((1 / data.rates.GBP) * 100) / 100, // Round to 2 decimals
      lastUpdated: new Date(data.date)
    };
  } catch (error) {
    console.error('Error fetching ECB exchange rate:', error);
    throw error;
  }
}
