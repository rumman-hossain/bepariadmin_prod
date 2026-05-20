import React, { useState } from 'react';
import { Share2, Save, Users, DollarSign, TrendingUp, AlertCircle, History, FileText, CheckCircle, X, Ticket } from 'lucide-react';
import { ReferralSettings, ReferralRecord, ReferralPayment } from '../types';

interface AdminReferralsProps {
    settings: ReferralSettings;
    onUpdateSettings: (settings: ReferralSettings) => void;
    referrals: ReferralRecord[];
    onAddPayment: (payment: ReferralPayment) => void;
    payments: ReferralPayment[];
    onSendCoupon: (referralId: string, couponCode: string) => void;
}

export const AdminReferrals: React.FC<AdminReferralsProps> = ({ settings, onUpdateSettings, referrals, onAddPayment, payments, onSendCoupon }) => {
    const [localSettings, setLocalSettings] = useState<ReferralSettings>(settings);
    const [isEditing, setIsEditing] = useState(false);
    const [activeView, setActiveView] = useState<'settings' | 'history' | 'ledger'>('settings');
    const [selectedReferral, setSelectedReferral] = useState<ReferralRecord | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Bkash' | 'Nagad'>('Cash');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [couponCode, setCouponCode] = useState('');

    const handleSaveSettings = () => {
        onUpdateSettings(localSettings);
        setIsEditing(false);
    };

    const handleOpenPaymentModal = (referral: ReferralRecord) => {
        setSelectedReferral(referral);
        setPaymentAmount(referral.cashReward); // Default to full cash reward amount
        setIsPaymentModalOpen(true);
    };

    const handleOpenCouponModal = (referral: ReferralRecord) => {
        setSelectedReferral(referral);
        setCouponCode(`REF-BONUS-${referral.id.split('-')[1]}`); // Auto-generate a suggestion
        setIsCouponModalOpen(true);
    };

    const handleConfirmPayment = () => {
        if (selectedReferral && paymentAmount > 0) {
            const newPayment: ReferralPayment = {
                id: `PAY-${Date.now()}`,
                referralId: selectedReferral.id,
                referrerName: selectedReferral.referrerName,
                amount: paymentAmount,
                method: paymentMethod,
                date: new Date().toISOString().split('T')[0],
                status: 'Completed',
                transactionId: `TXN-${Math.floor(Math.random() * 100000)}`
            };
            onAddPayment(newPayment);
            setIsPaymentModalOpen(false);
            setSelectedReferral(null);
        }
    };

    const handleConfirmSendCoupon = () => {
        if (selectedReferral && couponCode) {
            onSendCoupon(selectedReferral.id, couponCode);
            setIsCouponModalOpen(false);
            setSelectedReferral(null);
            setCouponCode('');
        }
    };

    const totalEarningsDistributed = referrals.reduce((sum, ref) => sum + ref.totalEarnings, 0);
    const activeReferrals = referrals.filter(r => r.status === 'Active').length;

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referral Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage affiliate program and commissions</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveView('settings')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'settings' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 dark:text-gray-300'}`}
                    >
                        Settings
                    </button>
                    <button 
                        onClick={() => setActiveView('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeView === 'history' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 dark:text-gray-300'}`}
                    >
                        <History className="w-4 h-4" />
                        Referral History
                    </button>
                    <button 
                        onClick={() => setActiveView('ledger')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeView === 'ledger' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 dark:text-gray-300'}`}
                    >
                        <FileText className="w-4 h-4" />
                        Payment Ledger
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Total Referrals</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{referrals.length}</p>
                </div>
                <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Commission Paid</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">৳{totalEarningsDistributed.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Active Affiliates</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeReferrals}</p>
                </div>
            </div>

            {activeView === 'settings' && (
                <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-emerald-600" />
                            Program Configuration
                        </h2>
                        <button 
                            onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                                isEditing 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            {isEditing ? <Save className="w-4 h-4" /> : null}
                            {isEditing ? 'Save Changes' : 'Edit Settings'}
                        </button>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Program Status
                                </label>
                                <div className="flex items-center gap-3">
                                    <button 
                                        disabled={!isEditing}
                                        onClick={() => setLocalSettings({...localSettings, isActive: true})}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                                            localSettings.isActive 
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                            : 'bg-white border-gray-200 dark:border-gray-700 text-gray-500'
                                        }`}
                                    >
                                        Active
                                    </button>
                                    <button 
                                        disabled={!isEditing}
                                        onClick={() => setLocalSettings({...localSettings, isActive: false})}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                                            !localSettings.isActive 
                                            ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-400' 
                                            : 'bg-white border-gray-200 dark:border-gray-700 text-gray-500'
                                        }`}
                                    >
                                        Disabled
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Commission Rate (Cash Reward)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" min="0" 
                                        disabled={!isEditing}
                                        value={localSettings.commissionRate}
                                        onChange={(e) => setLocalSettings({...localSettings, commissionRate: Number(e.target.value)})}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-10 py-2 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                                    />
                                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Percentage of order value given to referrer as Cash Reward for their first 5 orders.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Minimum Order Value
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">৳</span>
                                    <input 
                                        type="number" min="0" 
                                        disabled={!isEditing}
                                        value={localSettings.minOrderValue}
                                        onChange={(e) => setLocalSettings({...localSettings, minOrderValue: Number(e.target.value)})}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Minimum order amount required to trigger commission.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Sign-up Bonus (Coupon Value)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">৳</span>
                                    <input 
                                        type="number" min="0" 
                                        disabled={!isEditing}
                                        value={localSettings.bonusAmount || 0}
                                        onChange={(e) => setLocalSettings({...localSettings, bonusAmount: Number(e.target.value)})}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Coupon value given to new retailer for first order.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'history' && (
                <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Referral History</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500">
                                    <th className="px-6 py-3 font-semibold">Referrer</th>
                                    <th className="px-6 py-3 font-semibold">Referee</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold">Joined Date</th>
                                    <th className="px-6 py-3 font-semibold text-right">Cash Reward</th>
                                    <th className="px-6 py-3 font-semibold text-right">Coupon Reward</th>
                                    <th className="px-6 py-3 font-semibold text-right">Total Earnings</th>
                                    <th className="px-6 py-3 font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {referrals.map((ref) => (
                                    <tr key={ref.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            <div className="font-medium">{ref.referrerName}</div>
                                            <div className="text-xs text-gray-500">ID: {ref.referrerId}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {ref.refereeName}
                                            <span className="block text-xs text-gray-400">ID: {ref.refereeId}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                ref.status === 'Active' 
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                                {ref.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {ref.joinedDate}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">
                                            ৳{ref.cashReward.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">
                                            ৳{ref.couponReward.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right">
                                            ৳{ref.totalEarnings.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => handleOpenPaymentModal(ref)}
                                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={ref.cashReward === 0}
                                                >
                                                    Pay Cash
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button 
                                                    onClick={() => handleOpenCouponModal(ref)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={ref.couponReward === 0}
                                                >
                                                    Send Coupon
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeView === 'ledger' && (
                <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Referral Payment Ledger</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500">
                                    <th className="px-6 py-3 font-semibold">Payment ID</th>
                                    <th className="px-6 py-3 font-semibold">Referrer</th>
                                    <th className="px-6 py-3 font-semibold">Method</th>
                                    <th className="px-6 py-3 font-semibold">Transaction ID</th>
                                    <th className="px-6 py-3 font-semibold">Date</th>
                                    <th className="px-6 py-3 font-semibold text-right">Amount</th>
                                    <th className="px-6 py-3 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {payment.id}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {payment.referrerName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {payment.method}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                            {payment.transactionId}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {payment.date}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">
                                            ৳{payment.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            No payment history found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && selectedReferral && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manual Payout</h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                                <p className="text-sm text-gray-500 mb-1">Paying to</p>
                                <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedReferral.referrerName}</p>
                                <p className="text-xs text-gray-400">ID: {selectedReferral.referrerId}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Payment Amount (Cash Reward)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">৳</span>
                                    <input 
                                        type="number" min="0" 
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="w-full bg-white border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Available Cash Reward: ৳{selectedReferral.cashReward}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Payment Method
                                </label>
                                <select 
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Bank' | 'Bkash' | 'Nagad')}
                                    className="w-full bg-white border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Bank">Bank Transfer</option>
                                    <option value="Bkash">Bkash</option>
                                    <option value="Nagad">Nagad</option>
                                </select>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg flex gap-2 items-start">
                                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                    This action will record a payment in the ledger. Please ensure you have physically/digitally transferred the funds.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                            <button 
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmPayment}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Coupon Modal */}
            {isCouponModalOpen && selectedReferral && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Send Coupon Reward</h3>
                            <button onClick={() => setIsCouponModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                                <p className="text-sm text-gray-500 mb-1">Sending to</p>
                                <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedReferral.referrerName}</p>
                                <p className="text-xs text-gray-400">ID: {selectedReferral.referrerId}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Coupon Value
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">৳</span>
                                    <input 
                                        type="number" min="0" 
                                        value={selectedReferral.couponReward}
                                        disabled
                                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 outline-none text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Coupon Code
                                </label>
                                <div className="relative">
                                    <Ticket className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        placeholder="Enter coupon code"
                                        className="w-full bg-white border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">This code will be sent to the referrer.</p>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-2 items-start">
                                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                    Confirming this will mark the Coupon Reward as sent and deduct it from the pending balance.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                            <button 
                                onClick={() => setIsCouponModalOpen(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmSendCoupon}
                                disabled={!couponCode}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Send Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
