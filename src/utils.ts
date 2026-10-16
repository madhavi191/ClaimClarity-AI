/**
 * Format currency in Indian Rupees notation (e.g. ₹8,50,000)
 */
export function formatINR(val: number): string {
  if (!Number.isFinite(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}
