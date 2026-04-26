import i18n from '../../i18n';

// Fallback logic for locale. i18n.language might be 'en', 'hi', etc.
// For full Intl support, we map short codes to full BCP-47 tags if needed.
const getActiveLocale = () => {
  const lang = i18n.language || 'en';
  if (lang.startsWith('hi')) return 'hi-IN';
  return 'en-US';
};

/**
 * Format a number as currency based on the user's selected language
 */
export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
  return new Intl.NumberFormat(getActiveLocale(), {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};

/**
 * Format a Date object or ISO string based on the user's selected language
 */
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  return new Intl.DateTimeFormat(getActiveLocale(), defaultOptions).format(d);
};
