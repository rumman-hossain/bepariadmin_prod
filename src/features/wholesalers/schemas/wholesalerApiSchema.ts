import { z } from 'zod';

const wholesalerProfileSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    companyName: z.string().optional(),
    shopName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    category: z.string().optional(),
    margin: z.number().optional(),
    status: z.string().optional(),
    logoUrl: z.string().optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),
    updatedAt: z.union([z.string(), z.date()]).optional(),
    addresses: z.array(z.record(z.string(), z.unknown())).optional(),
    bankDetails: z.array(z.record(z.string(), z.unknown())).optional(),
    bkashWallets: z.array(z.record(z.string(), z.unknown())).optional(),
    documents: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export const wholesalerListResponseSchema = z.object({
  data: z.array(wholesalerProfileSchema),
  meta: z
    .object({
      total: z.number().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    })
    .optional(),
});

export const wholesalerDetailResponseSchema = z.object({
  data: wholesalerProfileSchema,
});

export type WholesalerProfilePayload = z.infer<typeof wholesalerProfileSchema>;
