import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getRetailers,
  getSegmentCounts,
  getCampaigns,
  createCampaign,
  type CampaignInput,
  type Window,
} from '../api/salesBrainApi';

const key = ['salesbrain'] as const;

export const useRetailerProfiles = (
  w: Window,
  filters: { district?: string; valueSegment?: string; behaviourSegment?: string },
  page: number,
) =>
  useQuery({
    // The window is part of the cache key: changing "active means 30 days" to
    // 90 asks a different question and must not read a cached answer to the
    // previous one.
    queryKey: [...key, 'retailers', w, filters, page],
    queryFn: () => getRetailers(w, filters, page),
  });

export const useSegmentCounts = (w: Window) =>
  useQuery({ queryKey: [...key, 'counts', w], queryFn: () => getSegmentCounts(w) });

export const useCampaigns = () => useQuery({ queryKey: [...key, 'campaigns'], queryFn: getCampaigns });

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignInput) => createCampaign(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...key, 'campaigns'] }),
  });
}
