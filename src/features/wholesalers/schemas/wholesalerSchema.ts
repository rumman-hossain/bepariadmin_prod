import { z } from 'zod';

/**
 * Wholesaler Address schema
 */
export const addressItemSchema = z.object({
  id: z.string().optional(),
  addressType: z.enum(['primary', 'warehouse', 'return', 'billing']).default('primary'),
  division: z.string().optional(),
  district: z.string().min(1, 'District is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  addressLine: z.string().min(1, 'Full address is required'),
  isDefault: z.boolean().default(false),
});

/**
 * Wholesaler Bank Detail schema
 */
export const bankItemSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1, 'Bank name is required'),
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  branch: z.string().optional().or(z.literal('')),
  routing: z.string().optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
});

/**
 * Wholesaler Mobile Wallet schema
 */
export const walletItemSchema = z.object({
  id: z.string().optional(),
  walletType: z.enum(['bkash', 'nagad', 'rocket', 'upay']).default('bkash'),
  accountNumber: z
    .string()
    .min(1, 'Account number is required')
    .regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi mobile number'),
  isDefault: z.boolean().default(false),
});

/**
 * Wholesaler Document schema
 */
export const documentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  date: z.string().optional(),
  status: z.string().default('Pending'),
  fileUrl: z.string().optional(),
});

export const wholesalerSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(2, 'Company name is required (min 2 chars)'),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  status: z.enum(['Active', 'Review', 'Suspended']).default('Active'),
  acceptanceRate: z.number().min(0).max(100).default(100),
  dispatchSpeed: z.string().default('24h'),
  riskScore: z.number().min(0).max(100).optional(),
  createdAt: z.string().optional(),

  // Owner & Contact
  ownerName: z.string().min(2, 'Owner name is required (min 2 chars)'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi mobile number'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  logoUrl: z.string().optional().or(z.literal('')),
  commissionRate: z.float32().min(0).max(100).optional().default(9.5),

  // Array Structures (Aligned with Backend)
  addresses: z.array(addressItemSchema).min(1, 'At least one address is required'),
  bankDetailsList: z.array(bankItemSchema).default([]),
  digitalWallets: z.array(walletItemSchema).default([]),
  documents: z.array(documentSchema).optional().default([]),

  // Login credentials (for onboarding only)
  password: z.string().optional(),
}).refine((data) => {
  // On onboarding (no id), password is required and must be at least 8 characters
  if (!data.id) {
    return !!data.password && data.password.length >= 8;
  }
  return true;
}, {
  message: 'Password is required (minimum 8 characters) for onboarding',
  path: ['password'],
});

export type WholesalerFormData = z.infer<typeof wholesalerSchema>;