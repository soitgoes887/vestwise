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
  country: 'US' | 'UK';
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

// Major companies offering equity compensation in the UK
const companyList: Company[] = [
  // US Companies
  { name: 'Adobe', ticker: 'ADBE', exchange: 'NASDAQ', country: 'US' },
  { name: 'Airbnb', ticker: 'ABNB', exchange: 'NASDAQ', country: 'US' },
  { name: 'Amazon', ticker: 'AMZN', exchange: 'NASDAQ', country: 'US' },
  { name: 'American Express', ticker: 'AXP', exchange: 'NYSE', country: 'US' },
  { name: 'Apple', ticker: 'AAPL', exchange: 'NASDAQ', country: 'US' },
  { name: 'Bank of America', ticker: 'BAC', exchange: 'NYSE', country: 'US' },
  { name: 'Citigroup', ticker: 'C', exchange: 'NYSE', country: 'US' },
  { name: 'Cisco', ticker: 'CSCO', exchange: 'NASDAQ', country: 'US' },
  { name: 'Dell Technologies', ticker: 'DELL', exchange: 'NYSE', country: 'US' },
  { name: 'Goldman Sachs', ticker: 'GS', exchange: 'NYSE', country: 'US' },
  { name: 'Google (Alphabet)', ticker: 'GOOGL', exchange: 'NASDAQ', country: 'US' },
  { name: 'HP Inc', ticker: 'HPQ', exchange: 'NYSE', country: 'US' },
  { name: 'IBM', ticker: 'IBM', exchange: 'NYSE', country: 'US' },
  { name: 'Intel', ticker: 'INTC', exchange: 'NASDAQ', country: 'US' },
  { name: 'JPMorgan Chase', ticker: 'JPM', exchange: 'NYSE', country: 'US' },
  { name: 'Mastercard', ticker: 'MA', exchange: 'NYSE', country: 'US' },
  { name: 'Meta (Facebook)', ticker: 'META', exchange: 'NASDAQ', country: 'US' },
  { name: 'Microsoft', ticker: 'MSFT', exchange: 'NASDAQ', country: 'US' },
  { name: 'Morgan Stanley', ticker: 'MS', exchange: 'NYSE', country: 'US' },
  { name: 'Netflix', ticker: 'NFLX', exchange: 'NASDAQ', country: 'US' },
  { name: 'NVIDIA', ticker: 'NVDA', exchange: 'NASDAQ', country: 'US' },
  { name: 'Oracle', ticker: 'ORCL', exchange: 'NYSE', country: 'US' },
  { name: 'PayPal', ticker: 'PYPL', exchange: 'NASDAQ', country: 'US' },
  { name: 'Qualcomm', ticker: 'QCOM', exchange: 'NASDAQ', country: 'US' },
  { name: 'Salesforce', ticker: 'CRM', exchange: 'NYSE', country: 'US' },
  { name: 'ServiceNow', ticker: 'NOW', exchange: 'NYSE', country: 'US' },
  { name: 'Snap', ticker: 'SNAP', exchange: 'NYSE', country: 'US' },
  { name: 'Splunk', ticker: 'SPLK', exchange: 'NASDAQ', country: 'US' },
  { name: 'Spotify', ticker: 'SPOT', exchange: 'NYSE', country: 'US' },
  { name: 'Tesla', ticker: 'TSLA', exchange: 'NASDAQ', country: 'US' },
  { name: 'Twitter (X)', ticker: 'TWTR', exchange: 'NYSE', country: 'US' },
  { name: 'Uber', ticker: 'UBER', exchange: 'NYSE', country: 'US' },
  { name: 'Visa', ticker: 'V', exchange: 'NYSE', country: 'US' },
  { name: 'VMware', ticker: 'VMW', exchange: 'NYSE', country: 'US' },
  { name: 'Workday', ticker: 'WDAY', exchange: 'NASDAQ', country: 'US' },

  // FTSE 100 / UK Companies
  { name: 'AstraZeneca', ticker: 'AZN.L', exchange: 'LSE', country: 'UK' },
  { name: 'Aviva', ticker: 'AV.L', exchange: 'LSE', country: 'UK' },
  { name: 'BAE Systems', ticker: 'BA.L', exchange: 'LSE', country: 'UK' },
  { name: 'Barclays', ticker: 'BARC.L', exchange: 'LSE', country: 'UK' },
  { name: 'BP', ticker: 'BP.L', exchange: 'LSE', country: 'UK' },
  { name: 'British American Tobacco', ticker: 'BATS.L', exchange: 'LSE', country: 'UK' },
  { name: 'BT Group', ticker: 'BT-A.L', exchange: 'LSE', country: 'UK' },
  { name: 'Burberry', ticker: 'BRBY.L', exchange: 'LSE', country: 'UK' },
  { name: 'Diageo', ticker: 'DGE.L', exchange: 'LSE', country: 'UK' },
  { name: 'GSK (GlaxoSmithKline)', ticker: 'GSK.L', exchange: 'LSE', country: 'UK' },
  { name: 'HSBC', ticker: 'HSBA.L', exchange: 'LSE', country: 'UK' },
  { name: 'ITV', ticker: 'ITV.L', exchange: 'LSE', country: 'UK' },
  { name: 'Legal & General', ticker: 'LGEN.L', exchange: 'LSE', country: 'UK' },
  { name: 'Lloyds Banking Group', ticker: 'LLOY.L', exchange: 'LSE', country: 'UK' },
  { name: 'National Grid', ticker: 'NG.L', exchange: 'LSE', country: 'UK' },
  { name: 'NatWest Group', ticker: 'NWG.L', exchange: 'LSE', country: 'UK' },
  { name: 'Prudential', ticker: 'PRU.L', exchange: 'LSE', country: 'UK' },
  { name: 'Reckitt Benckiser', ticker: 'RKT.L', exchange: 'LSE', country: 'UK' },
  { name: 'Relx', ticker: 'REL.L', exchange: 'LSE', country: 'UK' },
  { name: 'Rolls-Royce', ticker: 'RR.L', exchange: 'LSE', country: 'UK' },
  { name: 'Sage Group', ticker: 'SGE.L', exchange: 'LSE', country: 'UK' },
  { name: 'Sainsbury', ticker: 'SBRY.L', exchange: 'LSE', country: 'UK' },
  { name: 'Shell', ticker: 'SHEL.L', exchange: 'LSE', country: 'UK' },
  { name: 'Sky (Comcast)', ticker: 'SKY.L', exchange: 'LSE', country: 'UK' },
  { name: 'Standard Chartered', ticker: 'STAN.L', exchange: 'LSE', country: 'UK' },
  { name: 'Tesco', ticker: 'TSCO.L', exchange: 'LSE', country: 'UK' },
  { name: 'Unilever', ticker: 'ULVR.L', exchange: 'LSE', country: 'UK' },
  { name: 'Vodafone', ticker: 'VOD.L', exchange: 'LSE', country: 'UK' },
  { name: 'WPP', ticker: 'WPP.L', exchange: 'LSE', country: 'UK' },
];

export const COMPANIES = companyList.sort((a, b) => a.name.localeCompare(b.name));

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

    // UK stocks (LSE) are priced in pence, convert to pounds
    const isUKStock = ticker.endsWith('.L');
    const priceMultiplier = isUKStock ? 0.01 : 1;

    return {
      price: parseFloat(quote['05. price']) * priceMultiplier,
      change: parseFloat(quote['09. change']) * priceMultiplier,
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
