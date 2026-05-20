import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { PhoneCall, MessageCircle, CheckCircle2, AlertCircle, Clock, MoreVertical, Search, Filter, ArrowRight, UserPlus, TrendingUp, Star, Activity } from 'lucide-react';
import { Retailer } from '../types';

const TRIGGER_OPTIONS = [
    { value: 'all', label: 'All Triggers' },
    { value: 'no_order_48h', label: 'Registered, no order (48h)' },
    { value: 'cart_abandoned', label: 'Cart Abandoned' },
    { value: 'high_value_abandoned', label: 'High-Value Abandoned (>50k)' },
    { value: 'silent_14d', label: 'Regular buyer silent (14d)' },
    { value: 'score_drop_20', label: 'Score dropped 20+ pts' },
    { value: 'reward_milestone', label: 'Near reward milestone' },
    { value: 'payment_overdue', label: 'Payment Overdue' },
    { value: 'restock_reminder', label: 'Restock Reminder' },
    { value: 'loyalty_anniversary', label: 'Loyalty Anniversary' },
];

interface AdminCRMPipelineProps {
    retailers: Retailer[];
}

export const AdminCRMPipeline: React.FC<AdminCRMPipelineProps> = ({ retailers }) => {
    const [triggerFilter, setTriggerFilter] = useState<string>('all');

    const SMART_TASKS = useMemo(() => {
        const tasks: {
            id: number;
            retailer: string;
            phone: string;
            reason: string;
            triggerType: string;
            urgency: string;
            type: string;
            amount: number | null;
            lastContact: string;
            score: number;
            locationRanking: number;
            nextAction: string;
        }[] = [];
        retailers.forEach((retailer, index) => {
            const score = retailer.score || 0;
            const behavior = retailer.behaviorSegment || 'Active Buyer';
            const orderStatus = retailer.orderStatus || 'Active';
            const sales = retailer.monthlySales || retailer.totalGMV || 0;
            
            let triggerType = '';
            let reason = '';
            let urgency = 'low';
            let type = 'follow_up';
            let nextAction = '';
            let amount = null;

            if (orderStatus === 'Never Ordered') {
                triggerType = 'no_order_48h';
                reason = 'Registered but no order after 48 hours';
                urgency = 'medium';
                type = 'onboarding';
                nextAction = 'Call to explain first-order benefits';
            } else if (behavior === 'Browsing Not Buying') {
                if (sales > 50000) {
                    triggerType = 'high_value_abandoned';
                    reason = 'High-value cart abandoned (> ৳50,000)';
                    urgency = 'high';
                    type = 'sales';
                    amount = 52000;
                    nextAction = 'Personal call from Sales Manager';
                } else {
                    triggerType = 'cart_abandoned';
                    reason = 'Browsed products but cart abandoned';
                    urgency = 'high';
                    type = 'sales';
                    amount = 15400;
                    nextAction = 'Send Free Delivery Voucher';
                }
            } else if (behavior === 'Inactive' || score < 30) {
                triggerType = 'silent_14d';
                reason = 'Regular buyer silent for 14 days';
                urgency = 'medium';
                type = 'follow_up';
                nextAction = 'Check if competitor is offering better credit';
            } else if (score < 50 && score > 30) {
                triggerType = 'score_drop_20';
                reason = 'Activation score dropped 20+ points in a week';
                urgency = 'high';
                type = 'retention';
                nextAction = 'Offer 5% Re-activation Discount';
            } else if (score > 80 && sales > 100000) {
                triggerType = 'reward_milestone';
                reason = 'Retailer near reward milestone';
                urgency = 'low';
                type = 'upsell';
                nextAction = 'Encourage ৳2,000 more order for Gold';
            } else if (orderStatus === 'Payment Pending') {
                triggerType = 'payment_overdue';
                reason = 'Outstanding payment overdue by 7 days';
                urgency = 'high';
                type = 'collection';
                amount = 25000;
                nextAction = 'Formal payment reminder call';
            } else {
                // Default task for active users
                triggerType = 'restock_reminder';
                reason = 'Usually orders Soap every 3 weeks. Due for restock.';
                urgency = 'low';
                type = 'sales';
                nextAction = 'Send personalized restock list';
            }

            // Convert locationRanking string to number for stars
            let locRankNum = 3;
            if (typeof retailer.locationRanking === 'string') {
                if (retailer.locationRanking.includes('5') || retailer.locationRanking.includes('A')) locRankNum = 5;
                else if (retailer.locationRanking.includes('4') || retailer.locationRanking.includes('B')) locRankNum = 4;
            } else if (typeof retailer.locationRanking === 'number') {
                locRankNum = retailer.locationRanking;
            }

            tasks.push({
                id: index + 1,
                retailer: retailer.shopName,
                phone: retailer.mobile || retailer.phone || 'N/A',
                reason,
                triggerType,
                urgency,
                type,
                amount,
                lastContact: retailer.lastVisit || retailer.lastOrderDate || 'N/A',
                score,
                locationRanking: locRankNum,
                nextAction
            });
        });
        return tasks;
    }, [retailers]);

    const filteredTasks = SMART_TASKS.filter(task => 
        triggerFilter === 'all' || task.triggerType === triggerFilter
    );

    const getScoreColor = (score: number) => {
        if (score >= 61) return 'text-emerald-700 bg-emerald-100 border-emerald-200';
        if (score >= 31) return 'text-amber-700 bg-amber-100 border-amber-200';
        return 'text-red-700 bg-red-100 border-red-200';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-indigo-100 text-sm font-bold mb-1">Follow-ups Due Today</p>
                            <h3 className="text-3xl font-black">{filteredTasks.length}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm font-medium text-indigo-100 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> {filteredTasks.filter(t => t.urgency === 'high').length} High Urgency
                    </div>
                </Card>
                <Card className="p-5 rounded-2xl border-slate-200 shadow-sm bg-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-bold mb-1">Active Leads</p>
                            <h3 className="text-3xl font-black text-slate-900">42</h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <UserPlus className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm font-bold text-slate-500 flex items-center gap-1">
                        12 New this week
                    </div>
                </Card>
                <Card className="p-5 rounded-2xl border-slate-200 shadow-sm bg-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-bold mb-1">Conversion Rate</p>
                            <h3 className="text-3xl font-black text-slate-900">18.5%</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm font-bold text-emerald-600 flex items-center gap-1">
                        +2.4% from last month
                    </div>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="px-4 py-2">
                    <h2 className="text-lg font-black text-slate-900">Smart Follow-Up List</h2>
                    <p className="text-xs font-medium text-slate-500">AI-prioritized tasks for today</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto px-2">
                    <div className="relative flex-1 sm:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                            value={triggerFilter}
                            onChange={(e) => setTriggerFilter(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                        >
                            {TRIGGER_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search retailers..." className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-4">
                {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                        <Card key={task.id} className="p-0 overflow-hidden rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex flex-col sm:flex-row">
                                {/* Urgency Indicator */}
                                <div className={`w-full sm:w-2 ${task.urgency === 'high' ? 'bg-red-500' : task.urgency === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
                                
                                <div className="flex-1 p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-black text-slate-900 text-lg">{task.retailer}</h4>
                                            {task.urgency === 'high' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-full">Urgent</span>}
                                            <span className={`px-2 py-0.5 border text-[10px] font-black uppercase rounded-full flex items-center gap-1 ${getScoreColor(task.score)}`}>
                                                <Activity className="w-3 h-3" /> Score: {task.score}
                                            </span>
                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                                                <div className="flex items-center">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            className={`w-2.5 h-2.5 ${i < (typeof task.locationRanking === 'number' ? task.locationRanking : parseInt(task.locationRanking)) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                                                        />
                                                    ))}
                                                </div>
                                                Rank: {task.locationRanking}{typeof task.locationRanking === 'number' ? '*' : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                                            {task.reason}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 pt-1">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last Contact: {task.lastContact}</span>
                                            {task.amount && <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Value: ৳{task.amount.toLocaleString()}</span>}
                                            {task.nextAction && (
                                                <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md italic">
                                                    <ArrowRight className="w-3 h-3" /> Next Action: {task.nextAction}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                        <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-bold text-sm rounded-xl transition-colors">
                                            <MessageCircle className="w-4 h-4" />
                                            <span className="hidden sm:inline">WhatsApp</span>
                                        </button>
                                        <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-sm rounded-xl transition-colors">
                                            <PhoneCall className="w-4 h-4" />
                                            <span className="hidden sm:inline">Call</span>
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Mark as Done">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-500 font-bold">No follow-ups found for this trigger.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
