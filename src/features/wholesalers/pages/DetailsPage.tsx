import React, { useState } from 'react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/Button';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { DataTable, type Column } from '@/src/components/ui/DataTable';
import { ConfirmDialog } from '@/src/components/shared/ConfirmDialog';
import { EntityDetailsCard } from '@/src/components/shared/EntityDetailsCard';
//import { BankDetailsForm } from '@/src/components/shared/BankDetailsForm';
import { DocumentList } from '@/src/components/shared/DocumentList';
import { IdCard } from '@/src/components/shared/IdCard';
import { useWholesalerDetail } from '../hooks/useWholesalerDetail';
//import { MOCK_ORDERS, WHOLESALER_PAYMENTS } from '@/services/mockData';
import { Package, DollarSign, Star, Zap, Edit2, Save, X, MapPin, Building, FileText, Smartphone, ThumbsUp, ThumbsDown, AlertTriangle, Image } from 'lucide-react';
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
              { 
                icon: Image, 
                title: 'Company Logo', 
                content: (() => {
                  if (!w.logoUrl) return <span className="italic text-slate-400">Not Added</span>;
                  const displayUrl = w.logoUrl.startsWith('gs://') 
                    ? `https://storage.googleapis.com/${w.logoUrl.replace('gs://', '')}` 
                    : w.logoUrl.startsWith('mock-gcs://')
                      ? 'https://placehold.co/100x100?text=Uploaded+Logo' 
                      : w.logoUrl;
                  return (
                    <div className="flex items-center gap-3">
                      <img 
                        src={displayUrl} 
                        alt="Company Logo" 
                        className="w-14 h-14 object-cover rounded-xl border border-[rgba(60,60,67,0.12)] shadow-sm bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Logo';
                        }}
                      />
                      {w.logoUrl.startsWith('gs://') && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-1.5 py-0.5 rounded">GCS URL</span>}
                    </div>
                  );
                })()
              },
              { 
                icon: Package, 
                title: 'Business Categories', 
                content: w.category ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {w.category.split(',').map((c, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-[#007AFF] text-[10px] font-bold border border-blue-100 dark:border-blue-900/30 uppercase tracking-wider">{c.trim()}</span>
                    ))}
                  </div>
                ) : <span className="italic text-slate-400">None Specified</span>
              },
              { icon: Smartphone, title: 'Contact', content: <><span>{w.mobile || '—'}</span><br /><span className="text-xs text-slate-400">{w.email || '—'}</span></> },
              { 
                icon: MapPin, 
                title: 'Addresses', 
                content: (w.addresses && w.addresses.length > 0) ? (
                  <div className="space-y-2 mt-1">
                    {w.addresses.map((a, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[rgba(60,60,67,0.06)] flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>{a.addressType} address</span>
                          {a.isDefault && <span className="text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.2 rounded font-bold">Default</span>}
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{a.addressLine}</div>
                        <div className="text-[10px] text-slate-400">{a.district} - {a.postalCode}</div>
                      </div>
                    ))}
                  </div>
                ) : (w.address || <span className="italic text-slate-400">Not Added</span>) 
              },
              { 
                icon: Building, 
                title: 'Financial Information', 
                content: (
                  <div className="space-y-4 mt-1 w-full">
                    {/* Banks */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Bank Accounts</div>
                      {(w.bankDetailsList && w.bankDetailsList.length > 0) ? (
                        w.bankDetailsList.map((b, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[rgba(60,60,67,0.06)] flex flex-col gap-0.5">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                              <span className="font-bold">{b.bankName}</span>
                              {b.isDefault && <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.2 rounded">Default</span>}
                            </div>
                            <div className="text-xs font-mono text-slate-800 dark:text-slate-200">{b.accountNumber}</div>
                            <div className="text-[10px] text-slate-400">{b.accountName} {b.branch ? `• ${b.branch} Branch` : ''}</div>
                          </div>
                        ))
                      ) : (
                        w.bankDetails?.bankName ? (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[rgba(60,60,67,0.06)]">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{w.bankDetails.bankName}</div>
                            <div className="text-xs text-slate-500">{w.bankDetails.accountNumber}</div>
                          </div>
                        ) : <span className="text-xs italic text-slate-400">No bank accounts configured</span>
                      )}
                    </div>

                    {/* Mobile Wallets */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Mobile Wallets</div>
                      {(w.digitalWallets && w.digitalWallets.length > 0) ? (
                        w.digitalWallets.map((wallet, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[rgba(60,60,67,0.06)] flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{wallet.walletType}</span>
                              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{wallet.accountNumber}</span>
                            </div>
                            {wallet.isDefault && <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">Default</span>}
                          </div>
                        ))
                      ) : (
                        w.digitalWallet?.accountNumber ? (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[rgba(60,60,67,0.06)] flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{w.digitalWallet.accountNumber} ({w.digitalWallet.walletType})</span>
                          </div>
                        ) : <span className="text-xs italic text-slate-400">No mobile wallets configured</span>
                      )}
                    </div>
                  </div>
                ) 
              },
              { icon: FileText, title: 'Documents', content: <DocumentList documents={w.documents || []} /> },
            ]}
          />

          {/* ID Card */}
          <IdCard companyName={w.companyName} ownerName={w.ownerName} entityId={w.id} address={w.address} phone={w.mobile} />
        </div>

        {/* Right — Tables */}
        <div className="lg:col-span-2 space-y-6">
          <DataTable columns={orderColumns as unknown as Column<Record<string, unknown>>[]} data={[] as unknown as Record<string, unknown>[]} keyField={'id' as keyof Record<string, unknown>} emptyMessage="No orders found." />
          <DataTable columns={payoutColumns as unknown as Column<Record<string, unknown>>[]} data={[] as unknown as Record<string, unknown>[]} keyField={'id' as keyof Record<string, unknown>} emptyMessage="No payouts yet." />

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
              data={[]}
              keyField={'id' as keyof Record<string, unknown>}
              emptyMessage={`No ${historyTab.toLowerCase()} orders found.`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}