// Updated by LanguageContext whenever the active language changes, so every
// formatter below picks up locale-appropriate digit grouping/date order and
// the right currency without every call site needing to pass them explicitly.
let currentLocale = 'en-US';
let currentCurrency = 'USD';

export function setFormatLocale(locale: string): void {
  currentLocale = locale;
}

export function setFormatCurrency(currency: string): void {
  currentCurrency = currency;
}

export function formatPrice(price: number): string {
  return price.toLocaleString(currentLocale, {
    style: 'currency',
    currency: currentCurrency,
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  });
}

export function formatPercent(percent: number): string {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

export function formatCompactCurrency(value: number): string {
  return value.toLocaleString(currentLocale, {
    style: 'currency',
    currency: currentCurrency,
    notation: 'compact',
    maximumFractionDigits: 2,
  });
}

export function formatCompactNumber(value: number): string {
  return value.toLocaleString(currentLocale, { notation: 'compact', maximumFractionDigits: 2 });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(currentLocale, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(currentLocale, { month: 'short', day: 'numeric', year: 'numeric' });
}
