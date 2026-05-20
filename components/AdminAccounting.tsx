import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Order, PaymentRecord, ExpenseRecord } from '../types';
import { MOCK_WHOLESALERS } from '../services/mockData';
import { 
    DollarSign, TrendingUp, TrendingDown, CreditCard, 
    Truck, Activity, Calendar, Download, Landmark, Plus
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell 
} from 'recharts';

interface AdminAccountingProps {
    orders: Order[];
    payments: PaymentRecord[];
    expenses: ExpenseRecord[];
    onAddExpense: (expense: ExpenseRecord) => void;
}

export const AdminAccounting: React.FC<AdminAccountingProps> = ({ orders, payments, expenses, onAddExpense }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'advance' | 'cod' | 'courier' | 'settlement' | 'expenses' | 'bank'>('overview');
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState<Partial<ExpenseRecord>>({
        category: 'Operations',
        status: 'Paid',
        paymentMethod: 'Cash',
        date: new Date().toISOString().split('T')[0]
    });

    // Calculations
    const shippingCollected = orders
        .filter(o => o.status !== 'Cancelled' && o.status !== 'Rejected')
        .reduce((sum, o) => sum + (o.collectedShipping ?? 0), 0);

    const advanceReceived = orders
        .filter(o => o.status !== 'Cancelled' && o.status !== 'Rejected')
        .reduce((sum, o) => {
            const totalAdvance = o.collectedAdvance ?? Math.round(o.amount * 0.1);
            // If collectedAdvance is set, it includes shipping. We subtract it here to separate Product Advance from Shipping Income.
            // If collectedAdvance is not set (old data), shippingCollected is 0, so we just take the old 10% calc.
            const shipping = o.collectedShipping ?? 0;
            return sum + (totalAdvance - shipping);
        }, 0);

    const codReceived = orders
        .filter(o => ['Delivered', 'Settled', 'Completed'].includes(o.status))
        .reduce((sum, o) => {
            const advance = o.collectedAdvance ?? Math.round(o.amount * 0.1);
            // COD is simply Total Amount - Advance Paid. 
            // We do NOT subtract shipping again because advance already includes it (in new logic) 
            // or shipping wasn't separate (in old logic).
            return sum + (o.amount - advance);
        }, 0);

    const courierPaid = orders
        .filter(o => ['Dispatched', 'Delivered', 'Settled', 'Completed'].includes(o.status))
        .length * 120; // Assuming 120 BDT per shipment

    const wholesalerSettled = payments
        .filter(p => p.status === 'Settled')
        .reduce((sum, p) => sum + p.netPayable, 0);

    const totalExpenses = expenses
        .filter(e => e.status === 'Paid')
        .reduce((sum, e) => sum + e.amount, 0);

    const netCashFlow = (advanceReceived + shippingCollected + codReceived) - (courierPaid + wholesalerSettled + totalExpenses);

    // Chart Data
    const cashFlowData = [
        { name: 'Income', value: advanceReceived + shippingCollected + codReceived, color: '#10B981' },
        { name: 'Outflow', value: courierPaid + wholesalerSettled + totalExpenses, color: '#EF4444' },
    ];

    const expenseBreakdown = [
        { name: 'Wholesaler', value: wholesalerSettled, color: '#3B82F6' },
        { name: 'Courier', value: courierPaid, color: '#F59E0B' },
        { name: 'Ops/Mkt', value: totalExpenses, color: '#8B5CF6' },
    ];

    const renderOverview = () => (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium">Net Cash Flow</p>
                            <h3 className="text-2xl font-bold mt-1">৳{netCashFlow.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-emerald-100 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>+12.5% from last month</span>
                    </div>
                </Card>

                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Collections</p>
                            <h3 className="text-2xl font-bold text-black mt-1">৳{(advanceReceived + codReceived).toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Adv: ৳{advanceReceived.toLocaleString()}</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">COD: ৳{codReceived.toLocaleString()}</span>
                    </div>
                </Card>

                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Payouts</p>
                            <h3 className="text-2xl font-bold text-black mt-1">৳{(wholesalerSettled + courierPaid).toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                            <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">WHL: ৳{wholesalerSettled.toLocaleString()}</span>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">Courier: ৳{courierPaid.toLocaleString()}</span>
                    </div>
                </Card>

                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Operating Expenses</p>
                            <h3 className="text-2xl font-bold text-black mt-1">৳{totalExpenses.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                        Marketing, Tech, Salaries
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Income vs Expense Breakdown">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cashFlowData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" min="0" />
                                <YAxis dataKey="name" type="category" width={80} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {cashFlowData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Expense Distribution">
                    <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expenseBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {expenseBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderBankLedger = () => {
        // Collect all transactions
        interface Transaction {
            id: string;
            date: string;
            type: 'in' | 'out';
            category: string;
            description: string;
            amount: number;
            reference: string;
        }
        const transactions: Transaction[] = [];

        // 1. Advance Payments (Cash In)
        orders.forEach(o => {
            if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
                const advance = o.collectedAdvance ?? Math.round(o.amount * 0.1);
                transactions.push({
                    id: `ADV-${o.id}`,
                    date: o.date,
                    description: `Advance Payment - Order #${o.id}`,
                    type: 'Credit',
                    amount: advance,
                    category: 'Sales'
                });

                if (o.collectedShipping && o.collectedShipping > 0) {
                    transactions.push({
                        id: `SHP-${o.id}`,
                        date: o.date,
                        description: `Shipping Collected - Order #${o.id}`,
                        type: 'Credit',
                        amount: o.collectedShipping,
                        category: 'Logistics'
                    });
                }
            }
        });

        // 2. COD Received (Cash In)
        orders.forEach(o => {
            if (['Delivered', 'Settled', 'Completed'].includes(o.status)) {
                const advance = o.collectedAdvance ?? Math.round(o.amount * 0.1);
                const shipping = o.collectedShipping ?? 0;
                transactions.push({
                    id: `COD-${o.id}`,
                    date: o.date, // In real app, this would be delivery date
                    description: `COD Received - Order #${o.id}`,
                    type: 'Credit',
                    amount: o.amount - advance - shipping,
                    category: 'Sales'
                });
            }
        });

        // 3. Wholesaler Settlements (Cash Out)
        payments.forEach(p => {
            if (p.status === 'Settled') {
                transactions.push({
                    id: `PAY-${p.id}`,
                    date: p.date.split(' ')[0],
                    description: `Wholesaler Settlement - ${p.wholesalerId}`,
                    type: 'Debit',
                    amount: p.netPayable,
                    category: 'COGS'
                });
            }
        });

        // 4. Courier Costs (Cash Out)
        orders.forEach(o => {
            if (['Dispatched', 'Delivered', 'Settled', 'Completed'].includes(o.status)) {
                transactions.push({
                    id: `COU-${o.id}`,
                    date: o.date,
                    description: `Courier Charge - Order #${o.id}`,
                    type: 'Debit',
                    amount: 120,
                    category: 'Logistics'
                });
            }
        });

        // 5. Expenses (Cash Out)
        expenses.forEach(e => {
            if (e.status === 'Paid') {
                transactions.push({
                    id: e.id,
                    date: e.date,
                    description: `${e.category} - ${e.description}`,
                    type: 'Debit',
                    amount: e.amount,
                    category: 'Expense'
                });
            }
        });

        // Sort by date ascending to calculate running balance
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        const ledgerWithBalance = transactions.map(t => {
            if (t.type === 'Credit') {
                runningBalance += t.amount;
            } else {
                runningBalance -= t.amount;
            }
            return { ...t, balance: runningBalance };
        });

        // Reverse to show newest first
        const displayData = [...ledgerWithBalance].reverse();

        return (
            <Card className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-black">Bank Account Ledger</h3>
                        <p className="text-sm text-slate-500">Real-time transaction history</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Current Balance</p>
                        <h2 className={`text-2xl font-bold ${runningBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ৳{runningBalance.toLocaleString()}
                        </h2>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-right">Debit (Out)</th>
                                <th className="px-6 py-4 text-right">Credit (In)</th>
                                <th className="px-6 py-4 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                displayData.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 text-slate-500">{row.date}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{row.id}</td>
                                        <td className="px-6 py-4 font-medium text-black">{row.description}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                {row.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-red-600">
                                            {row.type === 'Debit' ? `৳${row.amount.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-emerald-600">
                                            {row.type === 'Credit' ? `৳${row.amount.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-black">
                                            ৳{row.balance.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        );
    };

    const renderTable = (type: 'advance' | 'cod' | 'courier' | 'settlement' | 'expenses') => {
        let columns: string[] = [];
        let data: Record<string, string | number>[] = [];

        if (type === 'advance') {
            columns = ['Order ID', 'Date', 'Retailer', 'Amount', 'Method', 'Status'];
            data = orders.filter(o => o.status !== 'Cancelled').map(o => ({
                id: o.id,
                col1: o.id,
                col2: o.date,
                col3: o.retailerName,
                col4: `৳${(o.collectedAdvance ?? Math.round(o.amount * 0.1)).toLocaleString()}`,
                col5: 'Bkash/Bank',
                col6: <span className="text-emerald-600 font-bold text-xs">Received</span>
            }));
        } else if (type === 'cod') {
            columns = ['Order ID', 'Date', 'Retailer', 'COD Amount', 'Courier', 'Status'];
            data = orders.filter(o => ['Delivered', 'Settled'].includes(o.status)).map(o => {
                const advance = o.collectedAdvance ?? Math.round(o.amount * 0.1);
                const shipping = o.collectedShipping ?? 0;
                return {
                    id: o.id,
                    col1: o.id,
                    col2: o.date,
                    col3: o.retailerName,
                    col4: `৳${(o.amount - advance - shipping).toLocaleString()}`,
                    col5: 'Steadfast',
                    col6: <span className="text-emerald-600 font-bold text-xs">Collected</span>
                };
            });
        } else if (type === 'courier') {
            columns = ['Order ID', 'Date', 'Courier', 'Charge', 'Collected', 'Status'];
            data = orders.filter(o => ['Dispatched', 'Delivered', 'Settled'].includes(o.status)).map(o => ({
                id: o.id,
                col1: o.id,
                col2: o.date,
                col3: 'Steadfast',
                col4: '৳120',
                col5: o.collectedShipping !== undefined ? `৳${o.collectedShipping}` : '-',
                col6: <span className="text-orange-600 font-bold text-xs">Due</span>
            }));
        } else if (type === 'settlement') {
            columns = ['Txn ID', 'Date', 'Wholesaler', 'Amount', 'Commission', 'Net Paid'];
            data = payments.map(p => {
                const wholesaler = MOCK_WHOLESALERS.find(w => w.id === p.wholesalerId);
                return {
                    id: p.id,
                    col1: p.id,
                    col2: p.date,
                    col3: wholesaler ? wholesaler.companyName : p.wholesalerId,
                    col4: `৳${p.amount.toLocaleString()}`,
                    col5: `৳${p.commission.toLocaleString()}`,
                    col6: `৳${p.netPayable.toLocaleString()}`
                };
            });
        } else if (type === 'expenses') {
            columns = ['Exp ID', 'Date', 'Category', 'Description', 'Amount', 'Status'];
            data = expenses.map(e => ({
                id: e.id,
                col1: e.id,
                col2: e.date,
                col3: e.category,
                col4: e.description,
                col5: `৳${e.amount.toLocaleString()}`,
                col6: <span className={`text-xs font-bold px-2 py-1 rounded-full ${e.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{e.status}</span>
            }));
        }

        return (
            <Card className="animate-fade-in">
                {type === 'expenses' && (
                    <div className="flex justify-end mb-4">
                        <button 
                            onClick={() => setShowAddExpenseModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Expense
                        </button>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                {columns.map((col, idx) => (
                                    <th key={idx} className="px-6 py-4">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                                        No records found.
                                    </td>
                                </tr>
                            ) : (
                                data.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 font-medium">{row.col1}</td>
                                        <td className="px-6 py-4 text-slate-500">{row.col2}</td>
                                        <td className="px-6 py-4">{row.col3}</td>
                                        <td className="px-6 py-4 font-mono">{row.col4}</td>
                                        <td className="px-6 py-4">{row.col5}</td>
                                        <td className="px-6 py-4">{row.col6}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-black">Accounting & Finance</h1>
                    <p className="text-slate-500 dark:text-slate-400">Financial overview, cash flow, and expense management</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <Calendar className="w-4 h-4" />
                        <span>This Month</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
                        <Download className="w-4 h-4" />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200 dark:border-slate-800">
                {[
                    { id: 'overview', label: 'Overview', icon: Activity },
                    { id: 'advance', label: 'Advance Payments', icon: DollarSign },
                    { id: 'cod', label: 'COD Received', icon: Truck },
                    { id: 'courier', label: 'Courier Payments', icon: Truck },
                    { id: 'settlement', label: 'Wholesaler Settlements', icon: CreditCard },
                    { id: 'expenses', label: 'Expenses', icon: CreditCard },
                    { id: 'bank', label: 'Bank Account', icon: Landmark },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'overview' | 'advance' | 'cod' | 'courier' | 'settlement' | 'expenses' | 'bank')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                activeTab === tab.id 
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'overview' ? renderOverview() : 
             activeTab === 'bank' ? renderBankLedger() : 
             renderTable(activeTab)}

            {/* Add Expense Modal */}
            {showAddExpenseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-black">Add New Expense</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                                <select 
                                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-black"
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value as 'Marketing' | 'Operations' | 'Salary' | 'Rent' | 'Software' | 'Logistics' | 'Office'})}
                                >
                                    {['Marketing', 'Operations', 'Salary', 'Rent', 'Software', 'Logistics', 'Office'].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (৳)</label>
                                <input 
                                    type="number" min="0" 
                                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-black"
                                    value={newExpense.amount || ''}
                                    onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-black"
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-black"
                                    value={newExpense.description || ''}
                                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                    placeholder="Expense details..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                <select 
                                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-black"
                                    value={newExpense.status}
                                    onChange={(e) => setNewExpense({...newExpense, status: e.target.value as 'Paid' | 'Pending'})}
                                >
                                    <option value="Paid">Paid</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                onClick={() => setShowAddExpenseModal(false)}
                                className="px-4 py-2 text-slate-500 hover:text-slate-700"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    if (newExpense.amount && newExpense.description) {
                                        onAddExpense({
                                            id: `EXP-${Math.floor(Math.random() * 10000)}`,
                                            ...newExpense as ExpenseRecord
                                        });
                                        setShowAddExpenseModal(false);
                                        setNewExpense({
                                            category: 'Operations',
                                            status: 'Paid',
                                            paymentMethod: 'Cash',
                                            date: new Date().toISOString().split('T')[0]
                                        });
                                    }
                                }}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                Add Expense
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
