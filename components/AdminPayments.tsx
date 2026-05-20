import React, { useState } from 'react';
import { Card } from './ui/Card';
import { CreditCard, ArrowUpRight, Search, Clock, Download, Eye, X } from 'lucide-react';
import { PaymentRecord, Order } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminPaymentsProps {
    payments: PaymentRecord[];
    orders: Order[];
    onUpdatePaymentStatus: (paymentId: string, status: 'Settled' | 'Pending') => void;
    onSettleOrder: (orderId: string, paymentMethod: string) => void;
}

export const AdminPayments: React.FC<AdminPaymentsProps> = ({ payments, orders, onSettleOrder }) => {
    const [activeTab, setActiveTab] = useState<'transactions' | 'confirmed'>('transactions');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Settled'>('All');
    const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [settleOrder, setSettleOrder] = useState<Order | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('');

    const filteredPayments = payments.filter(p => {
        const searchLower = (searchTerm || '').toLowerCase();
        const matchesSearch = (p.orderId || '').toLowerCase().includes(searchLower) || (p.id || '').toLowerCase().includes(searchLower);
        const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const confirmedOrders = orders.filter(o => !['Created', 'Cancelled', 'Rejected'].includes(o.status));

    const totalRevenue = payments.filter(p => p.status === 'Settled').reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);
    const totalCommission = payments.filter(p => p.status === 'Settled').reduce((sum, p) => sum + p.commission, 0);

    const getOrderDetails = (orderId: string) => {
        return orders.find(o => o.id === orderId);
    };

    const parseItems = (itemsString: string = '') => {
        const parts = itemsString.split('x ');
        if (parts.length === 2) {
            return { quantity: parts[0], name: parts[1] };
        }
        return { quantity: '1', name: itemsString };
    };

    const handleDownloadPDF = (payment: PaymentRecord) => {
        const doc = new jsPDF();
        const order = getOrderDetails(payment.orderId);
        const { quantity, name } = parseItems(order?.items);

        doc.setFontSize(18);
        doc.text('Transaction Receipt', 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Transaction ID: ${payment.id}`, 14, 32);
        doc.text(`Date: ${payment.date}`, 14, 38);

        autoTable(doc, {
            startY: 50,
            head: [['Description', 'Details']],
            body: [
                ['Order ID', payment.orderId],
                ['Product', name],
                ['Quantity', quantity],
                ['Buyer', order?.retailerName || 'N/A'],
                ['Seller', order?.wholesalerName || 'N/A'],
                ['Amount', `৳${payment.amount.toLocaleString()}`],
                ['Commission', `৳${payment.commission.toLocaleString()}`],
                ['Net Payable', `৳${payment.netPayable.toLocaleString()}`],
                ['Status', payment.status],
            ],
        });

        doc.save(`transaction-${payment.id}.pdf`);
    };

    const handleViewDetails = (payment: PaymentRecord) => {
        setSelectedPayment(payment);
        setIsViewModalOpen(true);
    };

    const handleSettleClick = (order: Order) => {
        setSettleOrder(order);
        setPaymentMethod('');
    };

    const confirmSettle = () => {
        if (settleOrder && paymentMethod) {
            onSettleOrder(settleOrder.id, paymentMethod);
            setSettleOrder(null);
            setPaymentMethod('');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Settle Modal */}
            {settleOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-black">Confirm Settlement</h3>
                            <button 
                                onClick={() => setSettleOrder(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600 dark:text-slate-300">
                                Are you sure you want to settle Order <span className="font-bold text-black">#{settleOrder.id}</span>?
                            </p>
                            <div className="bg-white/50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">Total Amount</span>
                                    <span className="font-medium text-black">৳{settleOrder.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">Commission</span>
                                    <span className="font-medium text-emerald-600">৳{(settleOrder.margin || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-600">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">Due to Settle</span>
                                    <span className="font-bold text-black">৳{(settleOrder.amount - (settleOrder.margin || 0)).toLocaleString()}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Payment Method <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                >
                                    <option value="">Select Method</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Bkash">Bkash</option>
                                    <option value="Nagad">Nagad</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-6 bg-white/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                            <button 
                                onClick={() => setSettleOrder(null)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmSettle}
                                disabled={!paymentMethod}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Settlement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewModalOpen && selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-black">Transaction Details</h3>
                            <button 
                                onClick={() => setIsViewModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400">Transaction ID</span>
                                <span className="font-mono font-medium text-black">{selectedPayment.id}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400">Order ID</span>
                                <span className="font-mono font-medium text-emerald-600">{selectedPayment.orderId}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400">Date</span>
                                <span className="text-black">{selectedPayment.date}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                                <span className="font-mono font-bold text-black">৳{selectedPayment.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400">Commission</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">৳{selectedPayment.commission.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400">Net Payable</span>
                                <span className="font-mono font-bold text-emerald-600">৳{selectedPayment.netPayable.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-slate-500 dark:text-slate-400">Status</span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    selectedPayment.status === 'Settled' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {selectedPayment.status}
                                </span>
                            </div>
                        </div>
                        <div className="p-6 bg-white/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                            <button 
                                onClick={() => handleDownloadPDF(selectedPayment)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                <Download className="w-4 h-4" />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h1 className="text-2xl font-bold text-black">Payments & Settlements</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage all transactions, advances, and settlements</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium mb-1">Total Settled Revenue</p>
                            <h3 className="text-3xl font-bold">৳{totalRevenue.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </Card>
                
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Pending Settlements</p>
                            <h3 className="text-3xl font-bold text-black">৳{pendingAmount.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Platform Commission</p>
                            <h3 className="text-3xl font-bold text-black">৳{totalCommission.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <ArrowUpRight className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('transactions')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'transactions' 
                        ? 'border-emerald-600 text-emerald-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    Transaction History
                </button>
                <button
                    onClick={() => setActiveTab('confirmed')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'confirmed' 
                        ? 'border-emerald-600 text-emerald-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    Confirmed Orders
                </button>
            </div>

            {activeTab === 'transactions' ? (
                <Card>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-lg font-bold text-black">Transaction History</h2>
                        <div className="flex gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search Order ID or TXN ID..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                                />
                            </div>
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as 'All' | 'Pending' | 'Settled')}
                                className="px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                            >
                                <option value="All">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Settled">Settled</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Transaction Details</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Product Details</th>
                                    <th className="px-6 py-4">Parties</th>
                                    <th className="px-6 py-4">Financials</th>
                                    <th className="px-6 py-4">Status & Net</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((payment) => {
                                        const order = getOrderDetails(payment.orderId);
                                        const { quantity, name } = parseItems(order?.items);
                                        
                                        return (
                                            <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                {/* Transaction ID & Order ID */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-black">{payment.id}</span>
                                                        <span className="text-xs text-emerald-600 font-medium">{payment.orderId}</span>
                                                    </div>
                                                </td>
                                                
                                                {/* Date & Time */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-black font-medium">{payment.date.split(' ')[0]}</span>
                                                        <span className="text-xs text-slate-500">{payment.date.split(' ')[1] || '--:--'}</span>
                                                    </div>
                                                </td>

                                                {/* Product Name & Quantity */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col max-w-[180px]">
                                                        <span className="text-black font-medium truncate" title={name}>{name}</span>
                                                        <span className="text-xs text-slate-500">Qty: {quantity}</span>
                                                    </div>
                                                </td>

                                                {/* Buyer & Seller */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col max-w-[150px]">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-slate-400">B:</span>
                                                            <span className="text-black truncate" title={order?.retailerName}>{order?.retailerName || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-slate-400">S:</span>
                                                            <span className="text-slate-700 dark:text-slate-300 truncate" title={order?.wholesalerName}>{order?.wholesalerName || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Amount & Commission */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-black">৳{payment.amount.toLocaleString()}</span>
                                                        <span className="text-xs text-slate-500">Comm: ৳{payment.commission.toLocaleString()}</span>
                                                    </div>
                                                </td>

                                                {/* Net Payable & Status */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-mono font-bold text-emerald-600">৳{payment.netPayable.toLocaleString()}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                                                            payment.status === 'Settled' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {payment.status}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Action */}
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => handleViewDetails(payment)}
                                                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDownloadPDF(payment)}
                                                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Download PDF"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-lg font-bold text-black">Confirmed Orders</h2>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search Order ID..." 
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Order ID</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Product & Qty</th>
                                    <th className="px-6 py-4">Buyer & Seller</th>
                                    <th className="px-6 py-4">Financials</th>
                                    <th className="px-6 py-4">Due (COD)</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {confirmedOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                                            No confirmed orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    confirmedOrders.map((order) => {
                                        const advancePaid = Math.round(order.amount * 0.1);
                                        const dueAmount = order.amount - advancePaid;
                                        const { quantity, name } = parseItems(order.items);
                                        const isCompleted = ['Delivered', 'Completed', 'Settled'].includes(order.status);

                                        return (
                                            <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 font-medium text-emerald-600">{order.id}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-black font-medium">{order.date.split(' ')[0]}</span>
                                                        <span className="text-xs text-slate-500">{order.date.split(' ')[1] || '--:--'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col max-w-[180px]">
                                                        <span className="text-black font-medium truncate" title={name}>{name}</span>
                                                        <span className="text-xs text-slate-500">Qty: {quantity}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col max-w-[150px]">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-slate-400">B:</span>
                                                            <span className="text-black truncate" title={order.retailerName}>{order.retailerName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-slate-400">S:</span>
                                                            <span className="text-slate-700 dark:text-slate-300 truncate" title={order.wholesalerName}>{order.wholesalerName}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs text-slate-500">Total: <span className="font-mono text-black">৳{order.amount.toLocaleString()}</span></span>
                                                        <span className="text-xs text-slate-500">Adv: <span className="font-mono text-emerald-600">৳{advancePaid.toLocaleString()}</span></span>
                                                        <span className="text-xs text-slate-500">Comm: <span className="font-mono text-blue-600">৳{(order.margin || 0).toLocaleString()}</span></span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-bold text-red-500">৳{dueAmount.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold w-fit block ${
                                                        order.status === 'Delivered' || order.status === 'Settled' ? 'bg-emerald-100 text-emerald-700' :
                                                        order.status === 'Dispatched' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex gap-2 justify-center items-center">
                                                        <button className="text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                                            Edit
                                                        </button>
                                                        {isCompleted && order.status !== 'Settled' && (
                                                            <button 
                                                                onClick={() => handleSettleClick(order)}
                                                                className="text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                                            >
                                                                Settle
                                                            </button>
                                                        )}
                                                        {order.status === 'Settled' && (
                                                            <span className="text-emerald-600 font-bold text-xs px-2">Settled</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};
