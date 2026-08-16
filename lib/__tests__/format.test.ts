process.env.TZ = 'UTC';

import {
  formatCompactCurrency,
  formatCompactNumber,
  formatDate,
  formatPercent,
  formatPrice,
  formatShortDate,
  setFormatCurrency,
  setFormatLocale,
} from '../format';

describe('format', () => {
  beforeEach(() => {
    setFormatLocale('en-US');
    setFormatCurrency('USD');
  });

  describe('formatPrice', () => {
    it('uses 2 decimal places for prices >= 1', () => {
      expect(formatPrice(63000.5)).toBe('$63,000.50');
    });

    it('uses up to 6 decimal places for prices < 1, so small coins keep precision', () => {
      expect(formatPrice(0.1234567)).toBe('$0.123457');
    });

    it('pads sub-$1 prices to at least 4 decimal places', () => {
      expect(formatPrice(0.5)).toBe('$0.5000');
    });

    it('follows the active currency set via setFormatCurrency', () => {
      setFormatCurrency('JPY');
      // The 2-decimal minimum this formatter always applies to prices >= 1
      // overrides JPY's usual zero-decimal convention — intentional, so a
      // 1000 JPY price and a 1000 USD price read with the same precision.
      expect(formatPrice(1000)).toBe('¥1,000.00');
    });
  });

  describe('formatPercent', () => {
    it('prefixes positive values with +', () => {
      expect(formatPercent(5.6)).toBe('+5.60%');
    });

    it('prefixes zero with + (treated as non-negative)', () => {
      expect(formatPercent(0)).toBe('+0.00%');
    });

    it('leaves negative values with their own - sign', () => {
      expect(formatPercent(-3.14159)).toBe('-3.14%');
    });
  });

  describe('formatCompactCurrency', () => {
    it('abbreviates large values', () => {
      expect(formatCompactCurrency(1_500_000)).toBe('$1.50M');
    });

    it('abbreviates billions', () => {
      expect(formatCompactCurrency(2_340_000_000)).toBe('$2.34B');
    });
  });

  describe('formatCompactNumber', () => {
    it('abbreviates large values without a currency symbol', () => {
      expect(formatCompactNumber(2_500_000)).toBe('2.5M');
    });
  });

  describe('formatDate', () => {
    it('renders the full month name', () => {
      expect(formatDate('2024-03-15T12:00:00.000Z')).toBe('March 15, 2024');
    });
  });

  describe('formatShortDate', () => {
    it('renders an abbreviated month', () => {
      expect(formatShortDate('2024-03-15T12:00:00.000Z')).toBe('Mar 15, 2024');
    });
  });
});
