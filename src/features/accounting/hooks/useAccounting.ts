import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSummary,
  getLedger,
  getExpenses,
  createExpense,
  payExpense,
  type ExpenseInput,
} from '../api/accountingApi';

const keys = {
  all: ['accounting'] as const,
  summary: (from: string, to: string) => [...keys.all, 'summary', from, to] as const,
  ledger: (from: string, to: string, page: number) =>
    [...keys.all, 'ledger', from, to, page] as const,
  expenses: (status: string) => [...keys.all, 'expenses', status] as const,
};

export const useSummary = (from: string, to: string) =>
  useQuery({ queryKey: keys.summary(from, to), queryFn: () => getSummary(from, to) });

export const useLedger = (from: string, to: string, page: number) =>
  useQuery({ queryKey: keys.ledger(from, to, page), queryFn: () => getLedger(from, to, page) });

export const useExpenses = (status: string) =>
  useQuery({ queryKey: keys.expenses(status), queryFn: () => getExpenses(status) });

/*
 * Both mutations invalidate the WHOLE accounting tree, not just the list they
 * touched. Paying an expense writes a ledger entry, which changes the running
 * balance on every later row and every summary figure — invalidating only the
 * expenses list would leave the ledger and the totals stale and quietly wrong.
 */
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => createExpense(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function usePayExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidOn }: { id: string; paidOn: string }) => payExpense(id, paidOn),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.all }),
  });
}
