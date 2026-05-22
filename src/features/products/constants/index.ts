export const PRODUCT_CATEGORIES = [
  'Apparel',
  'Electronics',
  'FMCG',
  'Footwear',
  'Bags',
  'Accessories',
  'Home & Living',
  'Beauty',
  'Sports',
  'Toys',
] as const;

export const PRODUCT_SUB_CATEGORIES: Record<string, string[]> = {
  Apparel: ['T-Shirts', 'Polo Shirts', 'Hoodies', 'Jackets', 'Pants', 'Shorts'],
  Electronics: ['Smartphones', 'Accessories', 'Audio', 'Wearables'],
  FMCG: ['Food', 'Beverages', 'Personal Care', 'Household'],
  Footwear: ['Sneakers', 'Formal', 'Sandals', 'Sports'],
  Bags: ['Backpacks', 'Handbags', 'Wallets', 'Luggage'],
  Accessories: ['Watches', 'Jewelry', 'Sunglasses', 'Hats'],
};

export const PRODUCT_STATUSES = [
  'Draft',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Out of Stock',
  'Archived',
  'Suspended',
] as const;

export const STOCK_LOW_THRESHOLD = 10;

export const DEFAULT_MARGIN = 15;