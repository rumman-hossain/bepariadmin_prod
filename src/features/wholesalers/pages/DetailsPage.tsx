import React, { useState } from 'react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/Button';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { DataTable, type Column } from '@/src/components/ui/DataTable';
import { ConfirmDialog } from '@/src/components/shared/ConfirmDialog';
import { EntityDetailsCard } from '@/src/components/shared/EntityDetailsCard';
import { BankDetailsForm } from '@/src/components/shared/BankDetailsForm';
import { DocumentList } from '@/src/components/shared/DocumentList';
import { IdCard } from '@/src/components/shared/IdCard';
import { useWholesalerDetail } from '../hooks/useWholesalerDetail';
//import { MOCK_ORDERS, WHOLESALER_PAYMENTS } from '@/services/mockData';
import { Package, DollarSign, Star, Zap, Edit2, Save, X, MapPin, Building, FileText, Smartphone, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import type { Order, PaymentRecord } from '@/src/types/domain';

export function DetailsPage() {
  const { selectedWholesaler, goBack, updateStatus, updateCommission } = useWholesalerDetail();
  const [isEditing, setIsEditing] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [commissionRate, setCommissionRate] = useState(15);
  const [historyTab, setHistoryTab] = useState<'Accepted' | 'Rejected'>('Accepted');

  if (!selectedWholesaler) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Wholesaler not found. <Button variant="ghost" onClick={goBack}>Go Back</Button>
      </div>
    );
  }

  const w = selectedWholesaler;
 // const orders = MOCK_ORDERS.filter(o => o.wholesalerName === w.companyName);
  //const payouts = WHOLESALER_PAYMENTS.filter(p => p.wholesalerId === w.id);
  //const acceptedOrders = orders.filter(o => ['Supplier Accepted', 'Payment Verified', 'Delivered', 'Settled'].includes(o.status));
  //const rejectedOrders = orders.filter(o => o.status === 'Rejected');

  const orderColumns: Column<Order>[] = [
    { key: 'id', header: 'Order ID', render: (o) => <span className="font-medium text-black">{o.id}</span> },
    { key: 'date', header: 'Date', render: (o) => <span className="text-slate-500">{o.date.split(' ')[0]}</span> },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'amount', header: 'Amount', className: 'text-right', render: (o) => <span className="font-medium">৳{o.amount.toLocaleString()}</span> },
  ];

  const payoutColumns: Column<PaymentRecord>[] = [
    { key: 'id', header: 'Txn ID', render: (p) => <span className="font-mono text-xs text-slate-500">{p.id}</span> },
    { key: 'date', header: 'Date', render: (p) => <span className="text-slate-500">{p.date}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'netPayable', header: 'Net Payout', className: 'text-right', render: (p) => <span className="font-bold text-emerald-600">৳{p.netPayable.toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Suspend Dialog */}
      <ConfirmDialog
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
        onConfirm={() => { updateStatus(w.id, 'Suspended'); setShowSuspend(false); }}
        title={`Suspend ${w.companyName}?`}
        message="This will immediately hide all approved products from the Retailer Portal."
        confirmLabel="Confirm Suspension"
        variant="danger"
      />

      {/* Header */}
      <PageHeader
        title={`${w.companyName} (${w.status})`}
        subtitle={`ID: ${w.id} • ${w.location || 'Dhaka'}${w.ownerName ? ` • ${w.ownerName}` : ''}`}
        onBack={goBack}
        actions={
          isEditing ? (
            <>
              <Button variant="secondary" size="md" iconLeft={X} onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button variant="primary" size="md" iconLeft={Save} onClick={() => setIsEditing(false)}>Save Changes</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="md" iconLeft={Package} onClick={() => {}}>Live Products</Button>
              <Button variant="secondary" size="md" iconLeft={Edit2} onClick={() => setIsEditing(true)}>Edit Profile</Button>
              <Button
                variant={w.status === 'Suspended' ? 'primary' : 'danger'}
                size="md"
                onClick={() => w.status === 'Suspended' ? updateStatus(w.id, 'Active') : setShowSuspend(true)}
              >
                {w.status === 'Suspended' ? 'Activate Account' : 'Suspend Account'}
              </Button>
            </>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Package, label: 'Total Orders', value: '1,245', bg: 'bg-blue-50 dark:bg-blue-900/10' },
          { icon: DollarSign, label: 'Total Payout', value: '৳ 4.2M', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
          { icon: Star, label: 'Rating', value: '4.8/5', bg: 'bg-gold-50 dark:bg-gold-900/10' },
          { icon: Zap, label: 'Dispatch Speed', value: w.dispatchSpeed, bg: 'bg-purple-50 dark:bg-purple-900/10' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`${s.bg} rounded-2xl p-4 flex items-center gap-4 border border-[rgba(60,60,67,0.06)]`}>
              <div className="p-3 rounded-full bg-white/60 dark:bg-white/10"><Icon className="w-6 h-6 text-[#007AFF]" /></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase">{s.label}</p><p className="text-xl font-bold text-[#1C1C1E] dark:text-white">{s.value}</p></div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Details */}
        <div className="space-y-6 lg:col-span-1">
          {/* Commission */}
          <EntityDetailsCard
            title="Commission Settings"
            sections={[{
              icon: AlertTriangle,
              title: 'Platform Commission (%)',
              content: (
                <div className="flex gap-2">
                  <input type="number" min="0" value={commissionRate} onChange={(e) => setCommissionRate(Math.max(0, Number(e.target.value)))}
                    className="w-full px-4 py-2 bg-white dark:bg-[#2C2C2E] border border-[rgba(60,60,67,0.16)] rounded-lg font-bold text-sm" />
                  <Button variant="primary" size="md" iconLeft={Save} onClick={() => updateCommission(w.id, commissionRate)} />
                </div>
              ),
            }]}
          />

          {/* Business Profile */}
          <EntityDetailsCard
            title="Business Profile"
            sections={[
              { icon: MapPin, title: 'Address', content: w.address || <span className="italic text-slate-400">Not Added</span> },
              { icon: Smartphone, title: 'Contact', content: <><span>{w.mobile || '—'}</span><br /><span className="text-xs text-slate-400">{w.email || '—'}</span></> },
              { icon: Building, title: 'Bank Details', content: <BankDetailsForm value={w.bankDetails || { bankName: '', accountName: '', accountNumber: '', branch: '', routing: '' }} bkashNumber={w.bkash || ''} onChange={() => {}} onBkashChange={() => {}} isEditing={isEditing} /> },
              { icon: FileText, title: 'Documents', content: <DocumentList documents={w.documents || []} /> },
            ]}
          />

          {/* ID Card */}
          <IdCard companyName={w.companyName} ownerName={w.ownerName} entityId={w.id} address={w.address} phone={w.mobile} />
        </div>

        {/* Right — Tables */}
        <div className="lg:col-span-2 space-y-6">
          <DataTable columns={orderColumns as unknown as Column<Record<string, unknown>>[]} data={0 as unknown as Record<string, unknown>[]} keyField={'id' as keyof Record<string, unknown>} emptyMessage="No orders found." />
          <DataTable columns={payoutColumns as unknown as Column<Record<string, unknown>>[]} data={0 as unknown as Record<string, unknown>[]} keyField={'id' as keyof Record<string, unknown>} emptyMessage="No payouts yet." />

          {/* Decision History Tabs */}
          <div className="bg-white/50 dark:bg-[#1C1C1E]/50 rounded-2xl border p-0 overflow-hidden">
            <div className="flex gap-2 border-b px-6 pt-2">
              <button className={`px-4 py-3 text-sm font-bold border-b-2 ${historyTab === 'Accepted' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500'}`} onClick={() => setHistoryTab('Accepted')}>
                <ThumbsUp className="w-4 h-4 inline mr-1" />Accepted ({0})
              </button>
              <button className={`px-4 py-3 text-sm font-bold border-b-2 ${historyTab === 'Rejected' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500'}`} onClick={() => setHistoryTab('Rejected')}>
                <ThumbsDown className="w-4 h-4 inline mr-1" />Rejected ({0})
              </button>
            </div>
            <DataTable
              columns={orderColumns as unknown as Column<Record<string, unknown>>[]}
              data={(historyTab === 'Accepted' ? 0 : 0) as unknown as Record<string, unknown>[]}
              keyField={'id' as keyof Record<string, unknown>}
              emptyMessage={`No ${historyTab.toLowerCase()} orders found.`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}