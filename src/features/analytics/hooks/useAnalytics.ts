import { useQuery } from '@tanstack/react-query';
import {
  getAnalyticsSummary,
  getSales,
  getTopRetailers,
  getTopProducts,
  getFraudFlags,
  type SalesPeriod,
} from '../api/analyticsApi';

const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
  sales: (period: SalesPeriod) => [...analyticsKeys.all, 'sales', period] as const,
  topRetailers: () => [...analyticsKeys.all, 'top-retailers'] as const,
  topProducts: () => [...analyticsKeys.all, 'top-products'] as const,
  fraud: () => [...analyticsKeys.all, 'fraud'] as const,
};

export function useAnalyticsSummary() {
  return useQuery({ queryKey: analyticsKeys.summary(), queryFn: getAnalyticsSummary });
}

export function useSales(period: SalesPeriod) {
  return useQuery({
    queryKey: analyticsKeys.sales(period),
    queryFn: () => getSales(period),
  });
}

export function useTopRetailers() {
  return useQuery({ queryKey: analyticsKeys.topRetailers(), queryFn: () => getTopRetailers() });
}

export function useTopProducts() {
  return useQuery({ queryKey: analyticsKeys.topProducts(), queryFn: () => getTopProducts() });
}

export function useFraudFlags() {
  return useQuery({ queryKey: analyticsKeys.fraud(), queryFn: () => getFraudFlags() });
}
