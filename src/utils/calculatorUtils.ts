// Utility functions for calculators

/**
 * Format large numbers to k/M format (e.g., 100000 -> 100k)
 */
export function formatValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toString();
}

/**
 * Format time elapsed since a date
 */
export function formatLastUpdated(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export interface VestingScheduleDetails {
  periods: number;
  intervalMonths: number;
}

/**
 * Get vesting schedule details from a schedule code
 */
export function getVestingScheduleDetails(schedule: string): VestingScheduleDetails {
  switch (schedule) {
    case '1y-cliff':
      return { periods: 1, intervalMonths: 12 };
    case '3y-annual':
      return { periods: 3, intervalMonths: 12 };
    case '3y-6m':
      return { periods: 6, intervalMonths: 6 };
    case '4y-3m':
      return { periods: 16, intervalMonths: 3 };
    case '4y-6m':
      return { periods: 8, intervalMonths: 6 };
    case '4y-annual':
      return { periods: 4, intervalMonths: 12 };
    default:
      return { periods: 8, intervalMonths: 6 };
  }
}

/**
 * Get human-readable label for a vesting schedule
 */
export function getVestingScheduleLabel(schedule: string): string {
  switch (schedule) {
    case '1y-cliff':
      return '1 Year Cliff (100% after 1 year)';
    case '3y-annual':
      return '3 Years Annual (3 periods)';
    case '3y-6m':
      return '3 Years Semi-Annual (6 periods)';
    case '4y-3m':
      return '4 Years Quarterly (16 periods)';
    case '4y-6m':
      return '4 Years Semi-Annual (8 periods)';
    case '4y-annual':
      return '4 Years Annual (4 periods)';
    default:
      return schedule;
  }
}

/**
 * Calculate projected stock price based on annual growth
 */
export function calculateProjectedStockPrice(
  currentPrice: number,
  annualGrowthPercent: number,
  months: number
): number {
  return currentPrice * Math.pow(1 + annualGrowthPercent / 100, months / 12);
}

/**
 * Calculate income tax and NI on a value
 */
export function calculateUKTax(
  value: number,
  incomeTaxRate: number,
  niRate: number
): { incomeTax: number; ni: number; total: number } {
  const incomeTax = value * (incomeTaxRate / 100);
  const ni = value * (niRate / 100);
  return { incomeTax, ni, total: incomeTax + ni };
}

/**
 * Calculate capital gains tax
 */
export function calculateCGT(
  capitalGain: number,
  cgtAllowance: number,
  cgtRate: number
): number {
  const taxableGain = Math.max(0, capitalGain - cgtAllowance);
  return taxableGain * (cgtRate / 100);
}
