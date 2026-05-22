import { z } from 'zod';

/**
 * Wholesaler form validation schema.
 * Matches the existing Wholesaler domain type from src/types/domain.ts
 * while being compatible with backend WholesalerProfile from beparibd-backend.
 */

export const bankDetailsSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  accountName: z.string().min(1, 'Account holder name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  branch: z.string().optional().or(z.literal('')),
  routing: z.string().optional().or(z.literal('')),
});

export const documentSchema = z.object({
  name: z.string().min(1),
  date: z.string().optional(),
  status: z.string(),
});

export const wholesalerSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(2, 'Company name is required (min 2 chars)'),
  category: z.string().min(1, 'Category is required'),
  location: z.string().min(1, 'Location is required'),
  status: z.enum(['Active', 'Review', 'Suspended']).default('Active'),
  acceptanceRate: z.number().min(0).max(100).default(100),
  dispatchSpeed: z.string().default('24h'),
  riskScore: z.number().min(0).max(100).optional(),
  createdAt: z.string().optional(),

  // Extended Details
  ownerName: z.string().min(2, 'Owner name is required (min 2 chars)'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi mobile number'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  bkash: z.string().optional().or(z.literal('')),
  commissionRate: z.number().min(0).max(100).optional(),
  bankDetails: bankDetailsSchema.optional(),
  documents: z.array(documentSchema).optional().default([]),

  // Login credentials (for create flow only)
  username: z.string().optional(),
  password: z.string().optional(),
});

export type WholesalerFormData = z.infer<typeof wholesalerSchema>;