import { z } from 'zod';
import { request } from '@/src/api/client';

/**
 * Accounting API — the cash book.
 *
 * Written from `beparibd-backend/internal/accounting/service.go`.
 *
 * Every amount is **integer paisa**. `Money` takes taka, so `toTaka` is applied
 * at the render site and nowhere else — a conversion scattered through a screen
 * is a second definition of the amount.
 *
 * There is no update and no delete on the ledger, at any layer. That is not an
 * oversight to be worked around: a correction is a compensating entry posted
 * through `/adjustments`, which is itself part of the record.
 */

export const DIRECTIONS = ['in', 'out'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const ledgerEntrySchema = z.object({
  id: z.string(),
  entryDate: z.string(),
  direction: z.enum(DIRECTIONS),
  category: z.string(),
  amountMinor: z.number(),
  balanceAfterMinor: z.number(),
  sourceType: z.string(),
  sourceId: z.string().optional(),
  description: z.string(),
  createdAt: z.string(),
});

export const summarySchema = z.object({
  openingMinor: z.number(),
  inMinor: z.number(),
  outMinor: z.number(),
  closingMinor: z.number(),
  byCategory: z.array(
    z.object({
      category: z.string(),
      direction: z.enum(DIRECTIONS),
      amountMinor: z.number(),
    }),
  ),
});

export const expenseSchema = z.object({
  id: z.string(),
  category: z.string(),
  amountMinor: z.number(),
  incurredOn: z.string(),
  description: z.string(),
  method: z.string(),
  status: z.string(),
  vendorName: z.string().optional(),
  ledgerEntryId: z.string().optional(),
  createdAt: z.string(),
  paidAt: z.string().optional(),
});

export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type Summary = z.infer<typeof summarySchema>;
export type Expense = z.infer<typeof expenseSchema>;

/** Paisa to taka, at the render boundary only. */
export const toTaka = (minor: number): number => minor / 100;

const BASE = '/api/v1/accounting';

async function get<T>(path: string, schema: z.ZodType<T>, label: string): Promise<T> {
  const res = await request<unknown>('GET', `${BASE}${path}`, { auth: true });
  if (!res.ok) throw new Error(`${label} could not be loaded`);
  return schema.parse(res.data);
}

export const getSummary = (from: string, to: string) =>
  get(`/summary?from=${from}&to=${to}`, z.object({ data: summarySchema }), 'The summary').then(
    (r) => r.data,
  );

export const getLedger = (from: string, to: string, page: number) =>
  get(
    `/ledger?from=${from}&to=${to}&page=${page}&limit=25`,
    z.object({
      data: z.array(ledgerEntrySchema),
      meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
    }),
    'The ledger',
  );

export const getExpenses = (status: string) =>
  get(
    `/expenses?status=${status}`,
    z.object({
      data: z.array(expenseSchema),
      meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
    }),
    'Expenses',
  );

/**
 * Parses what a person typed into paisa, exactly, or returns null.
 *
 * Deliberately NOT `Math.round(parseFloat(s) * 100)`. That works for most
 * inputs and quietly fails for some: floating point cannot hold 0.1, so a
 * multiply-then-round is a coin toss on the boundary. This splits on the
 * decimal point and does integer arithmetic, so the paisa figure is whatever
 * the operator typed and nothing else.
 *
 * Lives here, in a .ts module on the write path, rather than in the dialog:
 * this converts an INPUT into a payload, which is not the same act as a screen
 * deriving a figure the server already owns. G12 forbids the second. Reversing
 * that distinction would push the conversion into a component instead, which is
 * strictly worse.
 *
 * Returns null on anything not a plain amount — the caller shows the error.
 */
export function parseTakaToPaisa(input: string): number | null {
  const s = input.trim();
  // No sign: an expense is an amount, and "money out" is the direction, not a
  // negative number. A minus here would post backwards.
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  const paisa = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  // Beyond this the value stops being exact in a JS number, and an inexact
  // amount is worse than a refused one.
  if (!Number.isSafeInteger(paisa)) return null;
  return paisa;
}

export interface ExpenseInput extends Record<string, unknown> {
  category: string;
  amountMinor: number;
  incurredOn: string;
  description: string;
  method: string;
  vendorName?: string;
}

export async function createExpense(input: ExpenseInput): Promise<string> {
  const res = await request<unknown>('POST', `${BASE}/expenses`, { auth: true, body: input });
  if (!res.ok) {
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The expense could not be recorded');
  }
  return (res.data as { data: { id: string } }).data.id;
}

/**
 * Marks an expense paid AND posts it to the ledger — one server transaction.
 *
 * A 422 is the expected refusal when the expense is already paid or has been
 * voided, and the server's message names which. Safe to show.
 */
export async function payExpense(id: string, paidOn: string): Promise<string> {
  const res = await request<unknown>('POST', `${BASE}/expenses/${encodeURIComponent(id)}/pay`, {
    auth: true,
    body: { paidOn },
  });
  if (!res.ok) {
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The expense could not be marked paid');
  }
  return (res.data as { data: { ledgerEntryId: string } }).data.ledgerEntryId;
}
