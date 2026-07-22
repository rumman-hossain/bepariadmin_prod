import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/Button';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { EntityDetailsCard } from '@/src/components/shared/EntityDetailsCard';
import { DocumentList } from '@/src/components/shared/DocumentList';
import { ReasonDialog } from '../components/ReasonDialog';
import { WholesalerDetailStats } from '../components/WholesalerDetailStats';
import { WholesalerActivityPanels } from '../components/WholesalerActivityPanels';
import { useWholesalerDetail } from '../hooks/useWholesalerDetail';
import { useWholesalerActivity } from '../hooks/useWholesalerActivity';
import { useWholesalerStore } from '../store';
import { useAuth } from '@/src/hooks/useAuth';
import {
  Package,
  Edit2,
  Save,
  MapPin,
  Building,
  FileText,
  Smartphone,
  AlertTriangle,
  Image,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/src/components/ui/Toast';
import { toWholesalerApiError } from '../api/errors';
import { DEFAULT_COMMISSION_RATE } from '../constants';

type ReasonAction = 'suspend' | 'reject' | 'resubmit' | null;

function logoDisplayUrl(logoUrl?: string): string | null {
  if (!logoUrl || logoUrl.startsWith('data:') || logoUrl.startsWith('mock-gcs://')) return null;
  if (logoUrl.startsWith('gs://')) {
    return `https://storage.googleapis.com/${logoUrl.replace('gs://', '')}`;
  }
  return logoUrl;
}

export function DetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { wholesaler, isLoading, isMutating, error, goBack, goToEdit, refetch } =
    useWholesalerDetail(id ?? null);

  const updateCommission = useWholesalerStore((s) => s.updateCommission);
  const approveWholesalerAction = useWholesalerStore((s) => s.approveWholesalerAction);
  const rejectWholesalerAction = useWholesalerStore((s) => s.rejectWholesalerAction);
  const suspendWholesalerAction = useWholesalerStore((s) => s.suspendWholesalerAction);
  const unsuspendWholesalerAction = useWholesalerStore((s) => s.unsuspendWholesalerAction);
  const requestResubmitAction = useWholesalerStore((s) => s.requestResubmitAction);

  const [commissionRate, setCommissionRate] = useState(DEFAULT_COMMISSION_RATE);
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const { stats, orders, payouts, decisions } = useWholesalerActivity(id ?? null);

  useEffect(() => {
    if (wholesaler?.commissionRate !== undefined) {
      setCommissionRate(wholesaler.commissionRate);
    }
  }, [wholesaler?.commissionRate]);

  const runMutation = async (fn: () => Promise<void>, successMsg: string) => {
    try {
      await fn();
      toast.success('Updated', successMsg);
      await refetch();
    } catch (err) {
      toast.error('Action failed', toWholesalerApiError(err).message);
    }
  };

  const reviewerId = user?.id ?? '';

  if (isLoading && !wholesaler) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
        <p className="text-sm">Loading supplier...</p>
      </div>
    );
  }

  if (!wholesaler) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
        <p>{error ?? 'Wholesaler not found.'}</p>
        <Button variant="ghost" onClick={goBack}>
          Back to list
        </Button>
        {id && (
          <Button variant="outline" size="sm" iconLeft={RefreshCw} onClick={() => refetch()}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  const w = wholesaler;
  const displayLogo = logoDisplayUrl(w.logoUrl);

  const handleReasonConfirm = async (reason: string) => {
    if (!reasonAction || !id) return;
    const action = reasonAction;
    setReasonAction(null);
    await runMutation(async () => {
      if (action === 'suspend') await suspendWholesalerAction(id, reviewerId, reason);
      if (action === 'reject') await rejectWholesalerAction(id, reviewerId, reason);
      if (action === 'resubmit') await requestResubmitAction(id, reviewerId, reason);
    }, 'Supplier status updated.');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <ReasonDialog
        open={reasonAction === 'suspend'}
        onClose={() => setReasonAction(null)}
        onConfirm={handleReasonConfirm}
        title={`Suspend ${w.companyName}?`}
        message="This will hide approved products from the Retailer Portal. A reason is required."
        confirmLabel="Confirm Suspension"
        loading={isMutating}
      />
      <ReasonDialog
        open={reasonAction === 'reject'}
        onClose={() => setReasonAction(null)}
        onConfirm={handleReasonConfirm}
        title={`Reject ${w.companyName}?`}
        message="Reject this supplier application. A reason is required."
        confirmLabel="Reject Supplier"
        loading={isMutating}
      />
      <ReasonDialog
        open={reasonAction === 'resubmit'}
        onClose={() => setReasonAction(null)}
        onConfirm={handleReasonConfirm}
        title="Request resubmission"
        message="Ask the supplier to update their profile and resubmit."
        confirmLabel="Request Resubmit"
        variant="warning"
        loading={isMutating}
      />

      <PageHeader
        title={`${w.companyName} (${w.status})`}
        subtitle={`Code: ${w.code?.trim() || '—'}${w.location ? ` • ${w.location}` : ''}${w.ownerName ? ` • ${w.ownerName}` : ''}`}
        onBack={goBack}
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              iconLeft={Edit2}
              onClick={() => goToEdit(w.id)}
            >
              Edit Profile
            </Button>
            {w.status === 'Review' && (
              <>
                <Button
                  variant="primary"
                  size="md"
                  loading={isMutating}
                  onClick={() =>
                    runMutation(
                      () => approveWholesalerAction(w.id, reviewerId),
                      'Supplier approved.',
                    )
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setReasonAction('reject')}
                  disabled={isMutating}
                >
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setReasonAction('resubmit')}
                  disabled={isMutating}
                >
                  Request Resubmit
                </Button>
              </>
            )}
            {w.status === 'Suspended' && (
              <Button
                variant="primary"
                size="md"
                loading={isMutating}
                onClick={() =>
                  runMutation(
                    () => unsuspendWholesalerAction(w.id, reviewerId),
                    'Supplier activated.',
                  )
                }
              >
                Activate Account
              </Button>
            )}
            {w.status === 'Active' && (
              <Button
                variant="danger"
                size="md"
                onClick={() => setReasonAction('suspend')}
                disabled={isMutating}
              >
                Suspend Account
              </Button>
            )}
          </>
        }
      />

      <WholesalerDetailStats stats={stats} dispatchSpeedFallback={w.dispatchSpeed} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <EntityDetailsCard
            title="Commission Settings"
            sections={[
              {
                icon: AlertTriangle,
                title: 'Platform Commission (%)',
                content: (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Math.max(0, Number(e.target.value)))}
                      disabled={isMutating}
                      className="w-full px-4 py-2 bg-white dark:bg-[#2C2C2E] border border-[rgba(60,60,67,0.16)] rounded-lg font-bold text-sm"
                    />
                    <Button
                      variant="primary"
                      size="md"
                      iconLeft={Save}
                      loading={isMutating}
                      onClick={() =>
                        runMutation(
                          () => updateCommission(w.id, commissionRate),
                          'Commission rate saved.',
                        )
                      }
                    />
                  </div>
                ),
              },
            ]}
          />

          <EntityDetailsCard
            title="Business Profile"
            sections={[
              {
                icon: Building,
                title: 'Supplier code',
                content: (
                  <span className="font-mono font-bold text-sm text-[#1C1C1E] dark:text-white">
                    {w.code?.trim() || '—'}
                  </span>
                ),
              },
              {
                icon: Image,
                title: 'Company Logo',
                content: displayLogo ? (
                  <img
                    src={displayLogo}
                    alt="Company Logo"
                    className="w-14 h-14 object-cover rounded-xl border shadow-sm"
                  />
                ) : (
                  <span className="italic text-slate-400">Not Added</span>
                ),
              },
              {
                icon: MapPin,
                title: 'Location',
                content: w.location ? (
                  <span className="font-medium text-sm">{w.location}</span>
                ) : (
                  <span className="italic text-slate-400">Not specified</span>
                ),
              },
              {
                icon: Package,
                title: 'Business Categories',
                content: w.category ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {w.category.split(',').map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-[#007AFF] text-[10px] font-bold border border-blue-100 uppercase tracking-wider"
                      >
                        {c.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="italic text-slate-400">None Specified</span>
                ),
              },
              {
                icon: Smartphone,
                title: 'Contact',
                content: (
                  <>
                    <span>{w.mobile || '—'}</span>
                    <br />
                    <span className="text-xs text-slate-400">{w.email || '—'}</span>
                  </>
                ),
              },
              {
                icon: MapPin,
                title: 'Addresses',
                content:
                  w.addresses && w.addresses.length > 0 ? (
                    <div className="space-y-2 mt-1">
                      {w.addresses.map((a, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border flex flex-col gap-0.5"
                        >
                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase">
                            <span>{a.addressType} address</span>
                            {a.isDefault && (
                              <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold">{a.addressLine}</div>
                          <div className="text-[10px] text-slate-400">
                            {a.district} - {a.postalCode}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    w.address || <span className="italic text-slate-400">Not Added</span>
                  ),
              },
              {
                icon: Building,
                title: 'Financial Information',
                content: (
                  <div className="space-y-4 mt-1 w-full">
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-[#8E8E93] uppercase">Bank Accounts</div>
                      {w.bankDetailsList && w.bankDetailsList.length > 0 ? (
                        w.bankDetailsList.map((b, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                            <div className="text-xs font-bold">{b.bankName}</div>
                            <div className="text-xs font-mono">{b.accountNumber}</div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs italic text-slate-400">No bank accounts</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-[#8E8E93] uppercase">Mobile Wallets</div>
                      {w.digitalWallets && w.digitalWallets.length > 0 ? (
                        w.digitalWallets.map((wallet, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                            <span className="text-xs font-mono font-bold">{wallet.accountNumber}</span>
                            <span className="text-[9px] text-slate-400 uppercase ml-2">{wallet.walletType}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs italic text-slate-400">No mobile wallets</span>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                icon: FileText,
                title: 'Documents',
                content: <DocumentList documents={w.documents || []} />,
              },
            ]}
          />
        </div>

        <div className="lg:col-span-2">
          <WholesalerActivityPanels orders={orders} payouts={payouts} decisions={decisions} />
        </div>
      </div>
    </div>
  );
}
