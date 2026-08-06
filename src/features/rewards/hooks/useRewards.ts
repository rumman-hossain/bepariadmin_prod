import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSettings,
  saveSettings,
  getSummary,
  getBalances,
  getPoints,
  getReferrals,
  adjustPoints,
  type SettingsInput,
  type AdjustmentInput,
} from '../api/rewardsApi';

const key = ['loyalty'] as const;

export const useLoyaltySettings = () =>
  useQuery({ queryKey: [...key, 'settings'], queryFn: getSettings });

export const useLoyaltySummary = () =>
  useQuery({ queryKey: [...key, 'summary'], queryFn: getSummary });

export const useBalances = (page: number) =>
  useQuery({ queryKey: [...key, 'balances', page], queryFn: () => getBalances(page) });

export const usePoints = (retailerId: string, event: string, page: number) =>
  useQuery({
    queryKey: [...key, 'points', retailerId, event, page],
    queryFn: () => getPoints(retailerId, event, page),
  });

export const useReferrals = (status: string, page: number) =>
  useQuery({ queryKey: [...key, 'referrals', status, page], queryFn: () => getReferrals(status, page) });

/*
 * Both mutations invalidate the WHOLE loyalty tree rather than the list they
 * touched, and in both cases the wider blast radius is the correct one.
 *
 * Saving settings recomputes every retailer's tier in the same transaction, so
 * the balances list and the tier counts in the summary are stale the moment it
 * returns. Invalidating only the settings query would leave the screen showing
 * tiers from the previous thresholds.
 *
 * An adjustment changes that retailer's balance, their tier, the programme's
 * outstanding-points total and its money liability — four figures across three
 * queries, from one write.
 */
export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SettingsInput) => saveSettings(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useAdjustPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustmentInput) => adjustPoints(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
