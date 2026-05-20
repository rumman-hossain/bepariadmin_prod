import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Megaphone, Send, Users, Target, Calendar, BarChart3, MessageSquare, Smartphone, Bell, CheckCircle2, Clock, Plus, Activity } from 'lucide-react';
import { Retailer } from '../src/types/domain';

interface AdminPromotionalCampaignsProps {
    retailers: Retailer[];
}

const VALUE_SEGMENTS = ['High Potential', 'Medium Potential', 'Small Retailer'];
const BEHAVIOR_SEGMENTS = ['Active Buyer', 'Browsing Not Buying', 'Inactive', 'Churn Risk'];

export const AdminPromotionalCampaigns: React.FC<AdminPromotionalCampaignsProps> = ({ retailers }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
    
    // Create Campaign State
    const [campaignName, setCampaignName] = useState('');
    const [selectedChannel, setSelectedChannel] = useState('sms');
    const [messageContent, setMessageContent] = useState('');
    
    // Targeting State
    const [targetValueSegment, setTargetValueSegment] = useState('');
    const [targetBehaviorSegment, setTargetBehaviorSegment] = useState('');
    const [targetDistrict, setTargetDistrict] = useState('');
    const [targetScoreMin, setTargetScoreMin] = useState('');
    const [targetScoreMax, setTargetScoreMax] = useState('');

    // Calculate Audience Size
    const targetAudience = useMemo(() => {
        return retailers.filter(retailer => {
            const score = retailer.score || 0;
            return (
                (targetDistrict === '' || retailer.district === targetDistrict) &&
                (targetValueSegment === '' || (retailer.valueSegment || 'Medium Potential') === targetValueSegment) &&
                (targetBehaviorSegment === '' || (retailer.behaviorSegment || 'Active Buyer') === targetBehaviorSegment) &&
                (targetScoreMin === '' || score >= (parseInt(targetScoreMin) || 0)) &&
                (targetScoreMax === '' || score <= (parseInt(targetScoreMax) || 100))
            );
        });
    }, [retailers, targetDistrict, targetValueSegment, targetBehaviorSegment, targetScoreMin, targetScoreMax]);

    const mockCampaigns = [
        { id: 1, name: 'Eid Special Discount', channel: 'SMS', audience: 'High Potential', reach: 1250, sent: 1250, converted: 340, status: 'Completed', date: '2026-03-20' },
        { id: 2, name: 'Re-engagement Offer', channel: 'Push', audience: 'Inactive', reach: 850, sent: 850, converted: 45, status: 'Completed', date: '2026-03-25' },
        { id: 3, name: 'New Arrival Alert', channel: 'WhatsApp', audience: 'Active Buyer', reach: 420, sent: 210, converted: 0, status: 'Running', date: '2026-03-28' },
        { id: 4, name: 'Weekend Flash Sale', channel: 'In-App', audience: 'All', reach: 3500, sent: 0, converted: 0, status: 'Scheduled', date: '2026-04-01' },
    ];

    const insertVariable = (variable: string) => {
        setMessageContent(prev => prev + `{{${variable}}}`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 rounded-2xl border-0 shadow-lg shadow-indigo-100/50 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-indigo-100 text-sm font-medium mb-1">Active Campaigns</p>
                            <h3 className="text-3xl font-black">3</h3>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-indigo-100 flex items-center gap-1">
                        <span className="font-bold text-white">+1</span> scheduled this week
                    </div>
                </Card>
                
                <Card className="p-5 rounded-2xl border border-slate-200 shadow-sm bg-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Total Reach (30d)</p>
                            <h3 className="text-3xl font-black text-slate-900">12.4k</h3>
                        </div>
                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-emerald-600 flex items-center gap-1 font-medium">
                        <BarChart3 className="w-4 h-4" /> +15% vs last month
                    </div>
                </Card>

                <Card className="p-5 rounded-2xl border border-slate-200 shadow-sm bg-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Avg. Conversion</p>
                            <h3 className="text-3xl font-black text-slate-900">8.2%</h3>
                        </div>
                        <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                            <Target className="w-5 h-5 text-amber-600" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-amber-600 flex items-center gap-1 font-medium">
                        <BarChart3 className="w-4 h-4" /> +2.1% vs last month
                    </div>
                </Card>

                <Card className="p-5 rounded-2xl border border-slate-200 shadow-sm bg-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Campaign Revenue</p>
                            <h3 className="text-3xl font-black text-slate-900">৳4.2M</h3>
                        </div>
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-blue-600 flex items-center gap-1 font-medium">
                        <BarChart3 className="w-4 h-4" /> +৳850k vs last month
                    </div>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-px">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                    Campaign Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('create')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'create' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                    <Plus className="w-4 h-4" /> Create New Campaign
                </button>
            </div>

            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
                <Card className="p-0 rounded-3xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-black text-slate-900">Recent Campaigns</h3>
                        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-800">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="p-4 pl-6">Campaign Name</th>
                                    <th className="p-4">Channel</th>
                                    <th className="p-4">Target Audience</th>
                                    <th className="p-4 text-right">Reach</th>
                                    <th className="p-4 text-right">Converted</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 pr-6">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {mockCampaigns.map((campaign) => (
                                    <tr key={campaign.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4 pl-6 font-bold text-slate-900">{campaign.name}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                                                {campaign.channel === 'SMS' && <MessageSquare className="w-3.5 h-3.5" />}
                                                {campaign.channel === 'Push' && <Bell className="w-3.5 h-3.5" />}
                                                {campaign.channel === 'WhatsApp' && <Smartphone className="w-3.5 h-3.5" />}
                                                {campaign.channel === 'In-App' && <Smartphone className="w-3.5 h-3.5" />}
                                                {campaign.channel}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 font-medium">{campaign.audience}</td>
                                        <td className="p-4 text-right font-bold text-slate-700">{campaign.reach.toLocaleString()}</td>
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-emerald-600">{campaign.converted.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{((campaign.converted / campaign.reach) * 100).toFixed(1)}% rate</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                campaign.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                                                campaign.status === 'Running' ? 'bg-blue-50 text-blue-700' :
                                                'bg-amber-50 text-amber-700'
                                            }`}>
                                                {campaign.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                {campaign.status === 'Running' && <Activity className="w-3.5 h-3.5" />}
                                                {campaign.status === 'Scheduled' && <Clock className="w-3.5 h-3.5" />}
                                                {campaign.status}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-sm text-slate-500 font-medium">{campaign.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Create Campaign View */}
            {activeTab === 'create' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Builder */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm">1</span>
                                Campaign Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Campaign Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Eid Special Reactivation" 
                                        value={campaignName}
                                        onChange={(e) => setCampaignName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Communication Channel</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { id: 'sms', label: 'SMS', icon: MessageSquare },
                                            { id: 'push', label: 'Push Notification', icon: Bell },
                                            { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
                                            { id: 'inapp', label: 'In-App Banner', icon: Megaphone },
                                        ].map(channel => (
                                            <button
                                                key={channel.id}
                                                onClick={() => setSelectedChannel(channel.id)}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                                    selectedChannel === channel.id 
                                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <channel.icon className={`w-6 h-6 ${selectedChannel === channel.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                <span className="text-xs font-bold">{channel.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm">2</span>
                                Smart Audience Targeting
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Value Segment</label>
                                    <select 
                                        value={targetValueSegment}
                                        onChange={(e) => setTargetValueSegment(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500"
                                    >
                                        <option value="">All Value Segments</option>
                                        {VALUE_SEGMENTS.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Behavior Segment</label>
                                    <select 
                                        value={targetBehaviorSegment}
                                        onChange={(e) => setTargetBehaviorSegment(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500"
                                    >
                                        <option value="">All Behaviors</option>
                                        {BEHAVIOR_SEGMENTS.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">District</label>
                                    <select 
                                        value={targetDistrict}
                                        onChange={(e) => setTargetDistrict(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500"
                                    >
                                        <option value="">All Districts</option>
                                        {Array.from(new Set(retailers.map(r => r.district))).filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Min Score</label>
                                        <input 
                                            type="number" 
                                            placeholder="0"
                                            value={targetScoreMin}
                                            onChange={(e) => setTargetScoreMin(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Max Score</label>
                                        <input 
                                            type="number" 
                                            placeholder="100"
                                            value={targetScoreMax}
                                            onChange={(e) => setTargetScoreMax(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm">3</span>
                                Message Content
                            </h3>
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center mr-2">Insert Variables:</span>
                                    {['ShopName', 'OwnerName', 'PromoCode', 'DiscountAmount'].map(v => (
                                        <button 
                                            key={v}
                                            onClick={() => insertVariable(v)}
                                            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold hover:bg-indigo-100 transition-colors"
                                        >
                                            +{v}
                                        </button>
                                    ))}
                                </div>
                                <textarea 
                                    rows={5}
                                    placeholder="Type your promotional message here..."
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                                ></textarea>
                                <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                                    <span>{messageContent.length} characters</span>
                                    <span>{Math.ceil(messageContent.length / 160) || 1} SMS segment(s)</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Summary & Launch */}
                    <div className="space-y-6">
                        <Card className="p-6 rounded-3xl border-2 border-indigo-100 shadow-xl shadow-indigo-100/40 bg-gradient-to-b from-white to-indigo-50/30 sticky top-6">
                            <h3 className="text-lg font-black text-slate-900 mb-6">Campaign Summary</h3>
                            
                            <div className="space-y-6">
                                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-0.5">Estimated Reach</p>
                                        <h4 className="text-3xl font-black text-slate-900">{targetAudience.length.toLocaleString()}</h4>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">Retailers match your filters</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                        <span className="text-sm font-medium text-slate-500">Channel</span>
                                        <span className="text-sm font-bold text-slate-900 uppercase">{selectedChannel}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                        <span className="text-sm font-medium text-slate-500">Value Segment</span>
                                        <span className="text-sm font-bold text-slate-900">{targetValueSegment || 'All'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                        <span className="text-sm font-medium text-slate-500">Behavior</span>
                                        <span className="text-sm font-bold text-slate-900">{targetBehaviorSegment || 'All'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                        <span className="text-sm font-medium text-slate-500">Est. Cost (SMS)</span>
                                        <span className="text-sm font-bold text-slate-900">৳{(targetAudience.length * 0.5 * (Math.ceil(messageContent.length / 160) || 1)).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="pt-2 space-y-3">
                                    <button className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2">
                                        <Send className="w-4 h-4" />
                                        Launch Campaign Now
                                    </button>
                                    <button className="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Schedule for Later
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};
