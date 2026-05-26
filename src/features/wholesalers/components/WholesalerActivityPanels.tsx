import React, { useState } from 'react';
import { Card } from '@/src/components/ui/Card';
import type { Order, PaymentRecord } from '@/src/types/domain';
import type { WholesalerDecisionOrders } from '../api/stubs';
import {
  Package,
  CreditCard,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';

function EmptyPanel({
  icon: Icon,
  message,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-slate-400">
      <Icon className="w-10 h-10 mb-2 opacity-20" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
      {hint && <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">{hint}</p>}
    </div>
  );
}

function orderStatusClass(status: string): string {
  if (status === 'Delivered' || status === 'Settled') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  }
  if (status === 'Cancelled' || status === 'Rejected') {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
}

interface WholesalerActivityPanelsProps {
  orders: Order[];
  payouts: PaymentRecord[];
  decisions: WholesalerDecisionOrders;
}

export function WholesalerActivityPanels({ orders, payouts, decisions }: WholesalerActivityPanelsProps) {
  const [historyTab, setHistoryTab] = useState<'Accepted' | 'Rejected'>('Accepted');
  const acceptedCount = decisions.accepted.length;
  const rejectedCount = decisions.rejected.length;
  const activeOrders = historyTab === 'Accepted' ? decisions.accepted : decisions.rejected;

  return (
    <div className="space-y-6">
      <Card title="Assigned Order History" pad="md" glass>
        {orders.length > 0 ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase border-b border-[rgba(60,60,67,0.08)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Order ID</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[rgba(60,60,67,0.06)] hover:bg-slate-50/80 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-medium text-[#1C1C1E] dark:text-white">{order.id}</td>
                    <td className="px-4 py-3 text-slate-500">{order.date.split(' ')[0]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                          orderStatusClass(order.status),
                        )}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ৳{order.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel
            icon={Package}
            message="No orders found for this supplier."
            hint="Assigned orders will appear here when the wholesaler orders API is connected."
          />
        )}
      </Card>

      <Card title="Payout History" pad="md" glass>
        {payouts.length > 0 ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase border-b border-[rgba(60,60,67,0.08)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Txn ID</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Net Payout</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="border-b border-[rgba(60,60,67,0.06)] hover:bg-slate-50/80 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{payout.id}</td>
                    <td className="px-4 py-3 text-slate-500">{payout.date}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                          orderStatusClass(payout.status),
                        )}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{payout.netPayable.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel
            icon={CreditCard}
            message="No transactions available yet."
            hint="Payout records will appear here once the payout history API is connected."
          />
        )}
      </Card>

      <Card title="Decision History" pad="sm" glass className="overflow-hidden">
        <div className="flex gap-2 border-b border-[rgba(60,60,67,0.08)] px-2 -mt-2">
          <button
            type="button"
            className={cn(
              'px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2',
              historyTab === 'Accepted'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
            )}
            onClick={() => setHistoryTab('Accepted')}
          >
            <ThumbsUp className="w-4 h-4" />
            Accepted ({acceptedCount})
          </button>
          <button
            type="button"
            className={cn(
              'px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2',
              historyTab === 'Rejected'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
            )}
            onClick={() => setHistoryTab('Rejected')}
          >
            <ThumbsDown className="w-4 h-4" />
            Rejected ({rejectedCount})
          </button>
        </div>

        <div className="pt-2">
          {activeOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase border-b border-[rgba(60,60,67,0.08)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order ID</th>
                    <th className="px-4 py-3 font-medium">
                      {historyTab === 'Accepted' ? 'Accepted Date' : 'Date'}
                    </th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[rgba(60,60,67,0.06)] hover:bg-slate-50/80 dark:hover:bg-white/5"
                    >
                      <td
                        className={cn(
                          'px-4 py-3 font-medium',
                          historyTab === 'Rejected' && 'text-red-600 dark:text-red-400',
                        )}
                      >
                        {order.id}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{order.date}</td>
                      <td className="px-4 py-3 truncate max-w-[200px] text-slate-600 dark:text-slate-300">
                        {order.items || '—'}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-medium',
                          historyTab === 'Accepted' && 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        ৳{order.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              icon={historyTab === 'Accepted' ? ThumbsUp : ThumbsDown}
              message={
                historyTab === 'Accepted'
                  ? 'No accepted orders found.'
                  : 'No rejected orders found.'
              }
              hint="Decision history will populate when the wholesaler order decisions API is connected."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
