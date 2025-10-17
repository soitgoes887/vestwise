// Stock price service using Alpha Vantage API (free tier: 25 requests/day)
// Get your free API key at: https://www.alphavantage.co/support/#api-key

const ALPHA_VANTAGE_API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || 'demo';
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';

const RATE_LIMIT_KEY = 'alphavantage_rate_limit';
const DAILY_LIMIT = 25;

export interface StockPriceData {
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: Date;
}

export interface Company {
  name: string;
  ticker: string;
  exchange: string;
}

export interface RateLimitInfo {
  callsToday: number;
  remainingCalls: number;
  resetDate: string;
}

// Get rate limit info from localStorage
export function getRateLimitInfo(): RateLimitInfo {
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  const today = new Date().toISOString().split('T')[0];

  if (!stored) {
    return { callsToday: 0, remainingCalls: DAILY_LIMIT, resetDate: today };
  }

  try {
    const data = JSON.parse(stored);

    // Reset if it's a new day
    if (data.resetDate !== today) {
      return { callsToday: 0, remainingCalls: DAILY_LIMIT, resetDate: today };
    }

    return data;
  } catch {
    return { callsToday: 0, remainingCalls: DAILY_LIMIT, resetDate: today };
  }
}

// Increment call counter
function incrementCallCount() {
  const info = getRateLimitInfo();
  const newInfo: RateLimitInfo = {
    callsToday: info.callsToday + 1,
    remainingCalls: Math.max(0, DAILY_LIMIT - info.callsToday - 1),
    resetDate: info.resetDate
  };
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newInfo));
  return newInfo;
}

// Reset call counter (for manual reset)
export function resetRateLimitCounter() {
  const today = new Date().toISOString().split('T')[0];
  const newInfo: RateLimitInfo = {
    callsToday: 0,
    remainingCalls: DAILY_LIMIT,
    resetDate: today
  };
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newInfo));
  return newInfo;
}

// Largest US employers in the UK
export const US_COMPANIES_IN_UK: Company[] = [
  { name: 'Apple', ticker: 'AAPL', exchange: 'NASDAQ' },
  { name: 'Microsoft', ticker: 'MSFT', exchange: 'NASDAQ' },
  { name: 'Amazon', ticker: 'AMZN', exchange: 'NASDAQ' },
  { name: 'Google (Alphabet)', ticker: 'GOOGL', exchange: 'NASDAQ' },
  { name: 'Meta (Facebook)', ticker: 'META', exchange: 'NASDAQ' },
  { name: 'Netflix', ticker: 'NFLX', exchange: 'NASDAQ' },
  { name: 'Tesla', ticker: 'TSLA', exchange: 'NASDAQ' },
  { name: 'NVIDIA', ticker: 'NVDA', exchange: 'NASDAQ' },
  { name: 'Intel', ticker: 'INTC', exchange: 'NASDAQ' },
  { name: 'Cisco', ticker: 'CSCO', exchange: 'NASDAQ' },
  { name: 'Oracle', ticker: 'ORCL', exchange: 'NYSE' },
  { name: 'Salesforce', ticker: 'CRM', exchange: 'NYSE' },
  { name: 'Adobe', ticker: 'ADBE', exchange: 'NASDAQ' },
  { name: 'IBM', ticker: 'IBM', exchange: 'NYSE' },
  { name: 'Qualcomm', ticker: 'QCOM', exchange: 'NASDAQ' },
  { name: 'PayPal', ticker: 'PYPL', exchange: 'NASDAQ' },
  { name: 'Goldman Sachs', ticker: 'GS', exchange: 'NYSE' },
  { name: 'JPMorgan Chase', ticker: 'JPM', exchange: 'NYSE' },
  { name: 'Morgan Stanley', ticker: 'MS', exchange: 'NYSE' },
  { name: 'Citigroup', ticker: 'C', exchange: 'NYSE' },
  { name: 'Bank of America', ticker: 'BAC', exchange: 'NYSE' },
  { name: 'American Express', ticker: 'AXP', exchange: 'NYSE' },
  { name: 'Visa', ticker: 'V', exchange: 'NYSE' },
  { name: 'Mastercard', ticker: 'MA', exchange: 'NYSE' },
  { name: 'Uber', ticker: 'UBER', exchange: 'NYSE' },
  { name: 'Airbnb', ticker: 'ABNB', exchange: 'NASDAQ' },
  { name: 'Spotify', ticker: 'SPOT', exchange: 'NYSE' },
  { name: 'Snap', ticker: 'SNAP', exchange: 'NYSE' },
  { name: 'Twitter (X)', ticker: 'TWTR', exchange: 'NYSE' },
  { name: 'Dell Technologies', ticker: 'DELL', exchange: 'NYSE' },
  { name: 'HP Inc', ticker: 'HPQ', exchange: 'NYSE' },
  { name: 'VMware', ticker: 'VMW', exchange: 'NYSE' },
  { name: 'ServiceNow', ticker: 'NOW', exchange: 'NYSE' },
  { name: 'Workday', ticker: 'WDAY', exchange: 'NASDAQ' },
  { name: 'Splunk', ticker: 'SPLK', exchange: 'NASDAQ' },
].sort((a, b) => a.name.localeCompare(b.name));

export async function fetchStockPrice(ticker: string): Promise<StockPriceData> {
  try {
    // Check rate limit before making request
    const rateLimitInfo = getRateLimitInfo();
    if (rateLimitInfo.callsToday >= DAILY_LIMIT) {
      throw new Error(`Daily limit reached (${DAILY_LIMIT} calls/day). Resets tomorrow.`);
    }

    const url = `${ALPHA_VANTAGE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error('Invalid ticker symbol');
    }

    if (data['Note']) {
      throw new Error('API rate limit reached. Please try again later or use a different API key.');
    }

    const quote = data['Global Quote'];

    if (!quote || !quote['05. price']) {
      throw new Error('No price data available');
    }

    // Increment counter after successful call
    incrementCallCount();

    return {
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error fetching stock price:', error);
    throw error;
  }
}

// Alternative: Fallback to finnhub.io (also free, different rate limits)
export async function fetchStockPriceFinnhub(ticker: string): Promise<StockPriceData> {
  const FINNHUB_API_KEY = process.env.REACT_APP_FINNHUB_API_KEY;

  if (!FINNHUB_API_KEY) {
    throw new Error('Finnhub API key not configured');
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.c) {
      throw new Error('No price data available');
    }

    return {
      price: data.c, // current price
      change: data.d, // change
      changePercent: data.dp, // percent change
      lastUpdated: new Date(data.t * 1000) // timestamp
    };
  } catch (error) {
    console.error('Error fetching stock price from Finnhub:', error);
    throw error;
  }
}
