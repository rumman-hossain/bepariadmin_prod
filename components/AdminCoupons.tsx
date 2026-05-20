import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Edit2, Trash2, 
    Copy, CheckCircle, XCircle, Calendar, Tag, Percent, DollarSign,
    RefreshCw, Zap
} from 'lucide-react';
import { Coupon } from '../src/types/domain';

interface AdminCouponsProps {
    coupons: Coupon[];
    onAddCoupon: (coupon: Coupon) => void;
    onUpdateCoupon: (coupon: Coupon) => void;
    onDeleteCoupon: (id: string) => void;
}

export const AdminCoupons: React.FC<AdminCouponsProps> = ({ 
    coupons, 
    onAddCoupon, 
    onUpdateCoupon, 
    onDeleteCoupon 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    // Form State
    const [now, setNow] = useState(new Date().getTime());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date().getTime()), 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const expiringSoonCount = useMemo(() => {
        return coupons.filter(c => {
            const days = Math.ceil((new Date(c.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24));
            return days > 0 && days <= 7;
        }).length;
    }, [coupons, now]);

    // Form State
    const [formData, setFormData] = useState<Partial<Coupon>>({
        code: '',
        type: 'percentage',
        value: 0,
        minPurchase: 0,
        maxDiscount: 0,
        usageLimit: 100,
        expiryDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active'
    });

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, code }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (editingCoupon) {
            onUpdateCoupon({
                ...editingCoupon,
                ...formData as Coupon
            });
        } else {
            onAddCoupon({
                id: `CPN-${Date.now()}`,
                usedCount: 0,
                createdAt: new Date().toISOString(),
                ...formData as Coupon
            });
        }
        
        setIsModalOpen(false);
        setEditingCoupon(null);
        setFormData({
            code: '',
            type: 'percentage',
            value: 0,
            minPurchase: 0,
            maxDiscount: 0,
            usageLimit: 100,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active'
        });
    };

    const handleEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setFormData(coupon);
        setIsModalOpen(true);
    };

    const filteredCoupons = coupons.filter(coupon => {
        const matchesSearch = (coupon.code || '').toLowerCase().includes((searchTerm || '').toLowerCase());
        const matchesStatus = filterStatus === 'all' || coupon.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-black">Coupon Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage discount codes and promotions</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingCoupon(null);
                        setFormData({
                            code: '',
                            type: 'percentage',
                            value: 0,
                            minPurchase: 0,
                            maxDiscount: 0,
                            usageLimit: 100,
                            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            status: 'active'
                        });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Create Coupon
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                            <Tag className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Active Coupons</span>
                    </div>
                    <p className="text-2xl font-bold text-black">
                        {coupons.filter(c => c.status === 'active').length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Total Redemptions</span>
                    </div>
                    <p className="text-2xl font-bold text-black">
                        {coupons.reduce((acc, curr) => acc + curr.usedCount, 0)}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Expiring Soon</span>
                    </div>
                    <p className="text-2xl font-bold text-black">
                        {expiringSoonCount}
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by code..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'active', 'inactive'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                                filterStatus === status 
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Coupons List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCoupons.map(coupon => (
                    <div key={coupon.id} className="group relative bg-white rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                        {/* Status Stripe */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${coupon.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-mono font-bold text-black tracking-wider">
                                            {coupon.code}
                                        </h3>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(coupon.code)}
                                            className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                            title="Copy Code"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        coupon.status === 'active' 
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                    }`}>
                                        {coupon.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {coupon.status.charAt(0).toUpperCase() + coupon.status.slice(1)}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => handleEdit(coupon)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => onDeleteCoupon(coupon.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${coupon.type === 'percentage' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {coupon.type === 'percentage' ? <Percent className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold">Discount</p>
                                            <p className="font-bold text-black">
                                                {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `৳${coupon.value} OFF`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs mb-0.5">Min Purchase</p>
                                        <p className="font-medium text-black">
                                            {coupon.minPurchase ? `৳${coupon.minPurchase}` : 'None'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs mb-0.5">Usage</p>
                                        <p className="font-medium text-black">
                                            {coupon.usedCount} / {coupon.usageLimit || '∞'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs mb-0.5">Expires</p>
                                        <p className="font-medium text-black">
                                            {new Date(coupon.expiryDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs mb-0.5">Max Discount</p>
                                        <p className="font-medium text-black">
                                            {coupon.maxDiscount ? `৳${coupon.maxDiscount}` : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white/50">
                            <h2 className="text-lg font-bold text-black">
                                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Coupon Code</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.code}
                                            onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                            className="flex-1 px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono uppercase"
                                            placeholder="SUMMER25"
                                        />
                                        <button 
                                            type="button"
                                            onClick={generateCode}
                                            className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                            title="Generate Random Code"
                                        >
                                            <RefreshCw className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Discount Type</label>
                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, type: 'percentage'})}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                                formData.type === 'percentage' 
                                                ? 'bg-white text-emerald-600 shadow-sm' 
                                                : 'text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            Percentage (%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, type: 'fixed'})}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                                formData.type === 'fixed' 
                                                ? 'bg-white text-emerald-600 shadow-sm' 
                                                : 'text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            Fixed Amount (৳)
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {formData.type === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            required
                                            min="0"
                                            max={formData.type === 'percentage' ? 100 : undefined}
                                            value={formData.value}
                                            onChange={(e) => setFormData({...formData, value: Number(e.target.value)})}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            {formData.type === 'percentage' ? <Percent className="w-4 h-4" /> : <span className="font-bold">৳</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Min Purchase Amount</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={formData.minPurchase}
                                            onChange={(e) => setFormData({...formData, minPurchase: Number(e.target.value)})}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Max Discount Amount</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            min="0"
                                            disabled={formData.type === 'fixed'}
                                            value={formData.maxDiscount}
                                            onChange={(e) => setFormData({...formData, maxDiscount: Number(e.target.value)})}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                                            placeholder={formData.type === 'fixed' ? 'Not applicable' : ''}
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                                    </div>
                                    {formData.type === 'fixed' && <p className="text-xs text-slate-400">Not applicable for fixed amount discounts</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Usage Limit</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={formData.usageLimit}
                                        onChange={(e) => setFormData({...formData, usageLimit: Number(e.target.value)})}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Expiry Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                                    <select 
                                        value={formData.status}
                                        onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-colors"
                                >
                                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
