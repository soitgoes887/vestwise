import { COMPANIES, getRateLimitInfo, resetRateLimitCounter } from './stockPriceService';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('stockPriceService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('COMPANIES', () => {
    it('contains both US and UK companies', () => {
      const usCompanies = COMPANIES.filter(c => c.country === 'US');
      const ukCompanies = COMPANIES.filter(c => c.country === 'UK');

      expect(usCompanies.length).toBeGreaterThan(0);
      expect(ukCompanies.length).toBeGreaterThan(0);
    });

    it('is sorted alphabetically by name', () => {
      const names = COMPANIES.map(c => c.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sortedNames);
    });

    it('all companies have required fields', () => {
      COMPANIES.forEach(company => {
        expect(company.name).toBeTruthy();
        expect(company.ticker).toBeTruthy();
        expect(company.exchange).toBeTruthy();
        expect(['US', 'UK']).toContain(company.country);
      });
    });

    it('UK companies have .L suffix in ticker', () => {
      const ukCompanies = COMPANIES.filter(c => c.country === 'UK');
      ukCompanies.forEach(company => {
        expect(company.ticker).toMatch(/\.L$/);
      });
    });
  });

  describe('getRateLimitInfo', () => {
    it('returns default values when no data stored', () => {
      const info = getRateLimitInfo();
      expect(info.callsToday).toBe(0);
      expect(info.remainingCalls).toBe(25);
    });

    it('resets counter for a new day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      localStorage.setItem('alphavantage_rate_limit', JSON.stringify({
        callsToday: 10,
        remainingCalls: 15,
        resetDate: yesterdayStr
      }));

      const info = getRateLimitInfo();
      expect(info.callsToday).toBe(0);
      expect(info.remainingCalls).toBe(25);
    });
  });

  describe('resetRateLimitCounter', () => {
    it('resets counter to zero', () => {
      localStorage.setItem('alphavantage_rate_limit', JSON.stringify({
        callsToday: 20,
        remainingCalls: 5,
        resetDate: new Date().toISOString().split('T')[0]
      }));

      const info = resetRateLimitCounter();
      expect(info.callsToday).toBe(0);
      expect(info.remainingCalls).toBe(25);
    });
  });
});
