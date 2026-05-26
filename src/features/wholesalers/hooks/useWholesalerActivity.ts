import { useEffect, useState } from 'react';
import type { Order, PaymentRecord } from '@/src/types/domain';
import {
  getWholesalerStats,
  listWholesalerOrders,
  listWholesalerPayouts,
  listWholesalerDecisionOrders,
  type WholesalerStats,
  type WholesalerDecisionOrders,
} from '../api/stubs';

export function useWholesalerActivity(wholesalerId: string | null) {
  const [stats, setStats] = useState<WholesalerStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<PaymentRecord[]>([]);
  const [decisions, setDecisions] = useState<WholesalerDecisionOrders>({
    accepted: [],
    rejected: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!wholesalerId) {
      setStats(null);
      setOrders([]);
      setPayouts([]);
      setDecisions({ accepted: [], rejected: [] });
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      getWholesalerStats(wholesalerId),
      listWholesalerOrders(wholesalerId),
      listWholesalerPayouts(wholesalerId),
      listWholesalerDecisionOrders(wholesalerId),
    ])
      .then(([nextStats, nextOrders, nextPayouts, nextDecisions]) => {
        if (cancelled) return;
        setStats(nextStats);
        setOrders(nextOrders);
        setPayouts(nextPayouts);
        setDecisions(nextDecisions);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wholesalerId]);

  return { stats, orders, payouts, decisions, isLoading };
}
