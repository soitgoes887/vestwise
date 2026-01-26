import {
  formatValue,
  formatLastUpdated,
  getVestingScheduleDetails,
  getVestingScheduleLabel,
  calculateProjectedStockPrice,
  calculateUKTax,
  calculateCGT,
} from './calculatorUtils';

describe('calculatorUtils', () => {
  describe('formatValue', () => {
    it('formats millions with M suffix', () => {
      expect(formatValue(1000000)).toBe('1.0M');
      expect(formatValue(1500000)).toBe('1.5M');
      expect(formatValue(10000000)).toBe('10.0M');
    });

    it('formats thousands with k suffix', () => {
      expect(formatValue(1000)).toBe('1k');
      expect(formatValue(50000)).toBe('50k');
      expect(formatValue(999999)).toBe('1000k');
    });

    it('formats small numbers without suffix', () => {
      expect(formatValue(0)).toBe('0');
      expect(formatValue(100)).toBe('100');
      expect(formatValue(999)).toBe('999');
    });
  });

  describe('formatLastUpdated', () => {
    it('returns "just now" for very recent dates', () => {
      const now = new Date();
      expect(formatLastUpdated(now)).toBe('just now');
    });

    it('returns minutes ago for recent dates', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatLastUpdated(fiveMinutesAgo)).toBe('5 mins ago');
    });

    it('returns single minute correctly', () => {
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
      expect(formatLastUpdated(oneMinuteAgo)).toBe('1 min ago');
    });

    it('returns hours ago for older dates', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatLastUpdated(twoHoursAgo)).toBe('2 hours ago');
    });

    it('returns days ago for much older dates', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatLastUpdated(threeDaysAgo)).toBe('3 days ago');
    });
  });

  describe('getVestingScheduleDetails', () => {
    it('returns correct details for 1y-cliff', () => {
      const details = getVestingScheduleDetails('1y-cliff');
      expect(details.periods).toBe(1);
      expect(details.intervalMonths).toBe(12);
    });

    it('returns correct details for 4y-6m', () => {
      const details = getVestingScheduleDetails('4y-6m');
      expect(details.periods).toBe(8);
      expect(details.intervalMonths).toBe(6);
    });

    it('returns correct details for 4y-3m', () => {
      const details = getVestingScheduleDetails('4y-3m');
      expect(details.periods).toBe(16);
      expect(details.intervalMonths).toBe(3);
    });

    it('returns default for unknown schedule', () => {
      const details = getVestingScheduleDetails('unknown');
      expect(details.periods).toBe(8);
      expect(details.intervalMonths).toBe(6);
    });
  });

  describe('getVestingScheduleLabel', () => {
    it('returns human-readable label for known schedules', () => {
      expect(getVestingScheduleLabel('1y-cliff')).toBe('1 Year Cliff (100% after 1 year)');
      expect(getVestingScheduleLabel('4y-6m')).toBe('4 Years Semi-Annual (8 periods)');
      expect(getVestingScheduleLabel('4y-3m')).toBe('4 Years Quarterly (16 periods)');
    });

    it('returns the schedule code for unknown schedules', () => {
      expect(getVestingScheduleLabel('custom')).toBe('custom');
    });
  });

  describe('calculateProjectedStockPrice', () => {
    it('returns current price for 0 months', () => {
      expect(calculateProjectedStockPrice(100, 10, 0)).toBe(100);
    });

    it('calculates correct price after 12 months with 10% growth', () => {
      const result = calculateProjectedStockPrice(100, 10, 12);
      expect(result).toBeCloseTo(110, 1);
    });

    it('calculates correct price after 6 months with 10% growth', () => {
      const result = calculateProjectedStockPrice(100, 10, 6);
      expect(result).toBeCloseTo(104.88, 1);
    });

    it('handles negative growth', () => {
      const result = calculateProjectedStockPrice(100, -10, 12);
      expect(result).toBeCloseTo(90, 1);
    });
  });

  describe('calculateUKTax', () => {
    it('calculates correct tax at 45% income tax and 2% NI', () => {
      const result = calculateUKTax(10000, 45, 2);
      expect(result.incomeTax).toBe(4500);
      expect(result.ni).toBe(200);
      expect(result.total).toBe(4700);
    });

    it('handles zero values', () => {
      const result = calculateUKTax(0, 45, 2);
      expect(result.total).toBe(0);
    });

    it('handles basic rate tax', () => {
      const result = calculateUKTax(1000, 20, 12);
      expect(result.incomeTax).toBe(200);
      expect(result.ni).toBe(120);
      expect(result.total).toBe(320);
    });
  });

  describe('calculateCGT', () => {
    it('returns zero when gain is below allowance', () => {
      expect(calculateCGT(2000, 3000, 24)).toBe(0);
    });

    it('calculates correct CGT when gain exceeds allowance', () => {
      // £10,000 gain - £3,000 allowance = £7,000 taxable at 24%
      expect(calculateCGT(10000, 3000, 24)).toBe(1680);
    });

    it('handles exact allowance amount', () => {
      expect(calculateCGT(3000, 3000, 24)).toBe(0);
    });

    it('handles zero allowance', () => {
      expect(calculateCGT(10000, 0, 20)).toBe(2000);
    });
  });
});
