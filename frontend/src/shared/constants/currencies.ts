export const CURRENCIES = [
  { code: "INR", flag: "in", name: "Indian Rupee" },
  { code: "USD", flag: "us", name: "US Dollar" },
  { code: "EUR", flag: "eu", name: "Euro" },
  { code: "GBP", flag: "gb", name: "British Pound" },
  { code: "JPY", flag: "jp", name: "Japanese Yen" },
  { code: "AUD", flag: "au", name: "Australian Dollar" },
  { code: "CAD", flag: "ca", name: "Canadian Dollar" },
  { code: "CHF", flag: "ch", name: "Swiss Franc" },
  { code: "CNY", flag: "cn", name: "Chinese Yuan" },
  { code: "AED", flag: "ae", name: "UAE Dirham" },
  { code: "SGD", flag: "sg", name: "Singapore Dollar" },
  { code: "BRL", flag: "br", name: "Brazilian Real" },
  { code: "RUB", flag: "ru", name: "Russian Ruble" },
  { code: "SAR", flag: "sa", name: "Saudi Riyal" },
  { code: "TRY", flag: "tr", name: "Turkish Lira" },
  { code: "IDR", flag: "id", name: "Indonesian Rupiah" },
  { code: "NZD", flag: "nz", name: "NZ Dollar" },
  { code: "MXN", flag: "mx", name: "Mexican Peso" }
];

export const getCurrencyData = (code: string) => 
  CURRENCIES.find(c => c.code === code) || { code, flag: "un", name: code };
