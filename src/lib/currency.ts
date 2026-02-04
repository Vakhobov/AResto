// Currency formatting utility for Uzbek So'm (UZS)

export function formatPrice(price: number): string {
  // Convert to UZS (multiply by ~12,500 for realistic pricing)
  const uzsPrice = Math.round(price * 12500);
  
  // Format with thousand separators and append "so'm"
  return uzsPrice.toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}

export function formatPriceNumber(price: number): number {
  return Math.round(price * 12500);
}
