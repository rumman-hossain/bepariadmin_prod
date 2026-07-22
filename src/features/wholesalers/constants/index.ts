export const WHOLESALER_CATEGORIES = [
  'Apparel',
  'Electronics',
  'FMCG',
  'Footwear',
  'Bags',
] as const;

export const WHOLESALER_LOCATIONS = [
  'Dhaka',
  'Chittagong',
  'Sylhet',
  'Rajshahi',
  'Khulna',
] as const;

export const WHOLESALER_STATUSES = ['Active', 'Review', 'Suspended', 'Rejected'] as const;

/** Platform default margin when admin leaves commission blank on create. */
export const DEFAULT_COMMISSION_RATE = 9.5;

export const DEFAULT_DISPATCH_SPEED = '24h';