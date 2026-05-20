import React, { useState } from 'react';
import { Card } from './ui/Card';
import { 
    Users, Star, Filter, UserCircle, Table, Search, Download, 
    ChevronDown, MapPin, Calendar, ShoppingBag, CreditCard, 
    Activity, Clock, CheckCircle, Trophy
} from 'lucide-react';
import { Retailer } from '../types';

const VALUE_SEGMENTS = ['High Potential', 'Medium Potential', 'Small Retailer'];
const BEHAVIOR_SEGMENTS = ['Active Buyer', 'Browsing Not Buying', 'Inactive'];

interface AdminSegmentationEngineProps {
    retailers: Retailer[];
}

export const AdminSegmentationEngine: React.FC<AdminSegmentationEngineProps> = ({ retailers }) => {
    const [activeSubTab, setActiveSubTab] = useState('segments');
    const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(retailers[0] || null);
    const [filters, setFilters] = useState({
        district: '',
        upazila: '',
        category: '',
        orderStatus: '',
        valueSegment: '',
        behaviorSegment: '',
        scoreMin: '',
        scoreMax: ''
    });
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

    const filteredRetailers = React.useMemo(() => {
        return retailers.filter(retailer => {
            const score = retailer.score || 0;
            return (
                (filters.district === '' || retailer.district === filters.district) &&
                (filters.category === '' || (retailer.category && retailer.category.includes(filters.category))) &&
                (filters.orderStatus === '' || (retailer.orderStatus || 'Active') === filters.orderStatus) &&
                (filters.valueSegment === '' || (retailer.valueSegment || 'Medium Potential') === filters.valueSegment) &&
                (filters.behaviorSegment === '' || (retailer.behaviorSegment || 'Active Buyer') === filters.behaviorSegment) &&
                (filters.scoreMin === '' || score >= (parseInt(filters.scoreMin) || 0)) &&
                (filters.scoreMax === '' || score <= (parseInt(filters.scoreMax) || 100))
            );
        });
    }, [retailers, filters]);

    // Update selected retailer when retailers prop changes
    React.useEffect(() => {
        setSelectedRetailer(prev => prev || (retailers.length > 0 ? retailers[0] : null));
    }, [retailers]);

    const handleClearFilters = () => {
        setFilters({
            district: '',
            upazila: '',
            category: '',
            orderStatus: '',
            valueSegment: '',
            behaviorSegment: '',
            scoreMin: '',
            scoreMax: ''
        });
    };

    const handleExportCSV = () => {
        const headers = ['ID', 'Shop Name', 'Owner', 'Phone', 'District', 'Category', 'Value Segment', 'Behavior Segment', 'Score', 'Monthly Sales'];
        const csvData = filteredRetailers.map(r => [
            r.id,
            `"${r.shopName}"`,
            `"${r.ownerName}"`,
            r.mobile || r.phone || '',
            r.district,
            `"${r.category?.join(', ') || ''}"`,
            r.valueSegment || 'Medium Potential',
            r.behaviorSegment || 'Active Buyer',
            r.score || 0,
            r.monthlySales || r.totalGMV || 0
        ].join(','));
        
        const csvContent = [headers.join(','), ...csvData].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'retailers_segmentation.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkReassign = () => {
        if (selectedRowIds.size === 0) {
            alert('Please select at least one retailer to reassign.');
            return;
        }
        const agent = window.prompt('Enter the name of the Agent to reassign selected retailers to:');
        if (agent) {
            alert(`Successfully reassigned ${selectedRowIds.size} retailers to ${agent}.`);
            setSelectedRowIds(new Set());
        }
    };

    const toggleRowSelection = (id: string) => {
        const newSet = new Set(selectedRowIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedRowIds(newSet);
    };

    const toggleAllRows = () => {
        if (selectedRowIds.size === filteredRetailers.length) {
            setSelectedRowIds(new Set());
        } else {
            setSelectedRowIds(new Set(filteredRetailers.map(r => r.id)));
        }
    };

    const handleApplyFilters = () => {
        // Filters are applied automatically via useMemo, this is just for the button click
    };

    const subTabs = [
        { id: 'segments', label: 'Segments', icon: Users },
        { id: 'score', label: 'Retailer Score', icon: Star },
        { id: 'filter', label: 'Advanced Filter', icon: Filter },
        { id: 'profile', label: '360° Profile', icon: UserCircle },
        { id: 'table', label: 'Admin Panel View', icon: Table },
    ];

    const getScoreColor = (score: number) => {
        if (score >= 61) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (score >= 31) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getScoreGaugeColor = (score: number) => {
        if (score >= 61) return '#10b981'; // emerald-500
        if (score >= 31) return '#f59e0b'; // amber-500
        return '#ef4444'; // red-500
    };

    return (
        <div className="space-y-6">
            {/* Sub-navigation */}
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 border-b border-slate-200">
                {subTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeSubTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                                isActive 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Contents */}
            
            {/* 1. Segments Tab */}
            {activeSubTab === 'segments' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                <Star className="w-5 h-5 text-indigo-600" />
                                Value Segmentation (Manual Assignment)
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">Assign retailers to value segments based on their business potential.</p>
                            
                            <div className="space-y-4">
                                {retailers.map(retailer => (
                                    <div key={retailer.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h4 className="font-bold text-slate-900">{retailer.shopName}</h4>
                                            <p className="text-xs text-slate-500">{retailer.id} • {retailer.district}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">Loc: {retailer.locationRanking || 'N/A'}</span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">Sales: ৳{(retailer.monthlySales || retailer.totalGMV || 0).toLocaleString()}</span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">{retailer.yearsInBusiness || 1} Yrs</span>
                                            </div>
                                        </div>
                                        <select 
                                            defaultValue={retailer.valueSegment || 'Medium Potential'}
                                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        >
                                            {VALUE_SEGMENTS.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-600" />
                                Behavior Segmentation (Auto Assigned)
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">Automatically categorized based on platform activity and purchase history.</p>
                            
                            <div className="space-y-4">
                                {retailers.map(retailer => {
                                    const behavior = retailer.behaviorSegment || 'Active Buyer';
                                    return (
                                        <div key={retailer.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold text-slate-900">{retailer.shopName}</h4>
                                                <p className="text-xs text-slate-500">Last Active: {retailer.lastVisit || retailer.lastOrderDate || 'N/A'}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                behavior === 'Active Buyer' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                behavior === 'Browsing Not Buying' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {behavior}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* 2. Retailer Score Tab */}
            {activeSubTab === 'score' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Scoreboard - MOVED TO TOP */}
                    <Card className="p-0 rounded-3xl border-0 shadow-lg shadow-slate-200/40 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    Live Retailer Scoreboard
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Automatically calculated based on platform activity.</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="p-4 pl-6">Rank</th>
                                        <th className="p-4">Retailer</th>
                                        <th className="p-4 text-center">Total Score</th>
                                        <th className="p-4 text-center">Login (25)</th>
                                        <th className="p-4 text-center">Browsing (20)</th>
                                        <th className="p-4 text-center">Orders (30)</th>
                                        <th className="p-4 text-center">Payment (15)</th>
                                        <th className="p-4 pr-6 text-center">Rewards (10)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[...retailers].sort((a, b) => (b.score || 0) - (a.score || 0)).map((retailer, index) => {
                                        const score = retailer.score || 0;
                                        const breakdown = retailer.scoreBreakdown || { login: 0, browsing: 0, orders: 0, payment: 0, rewards: 0 };
                                        return (
                                            <tr key={retailer.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : index === 1 ? 'bg-slate-200 text-slate-700 border-2 border-slate-300' : index === 2 ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' : 'bg-slate-50 text-slate-500'}`}>
                                                        #{index + 1}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-900">{retailer.shopName}</div>
                                                    <div className="text-xs text-slate-500">{retailer.id}</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 font-black text-sm ${getScoreColor(score)}`}>
                                                        {score}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center font-medium text-slate-700">{breakdown.login}</td>
                                                <td className="p-4 text-center font-medium text-slate-700">{breakdown.browsing}</td>
                                                <td className="p-4 text-center font-medium text-slate-700">{breakdown.orders}</td>
                                                <td className="p-4 text-center font-medium text-slate-700">{breakdown.payment}</td>
                                                <td className="p-4 pr-6 text-center font-medium text-slate-700">{breakdown.rewards}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Retailer Scoring System</h3>
                                    <p className="text-sm text-slate-500 mt-1">Scores are calculated weekly (0-100 points).</p>
                                </div>
                                <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Run Cron Job Now
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">App login frequency</span>
                                    <span className="text-indigo-600 font-black">25 pts</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">Product browsing activity</span>
                                    <span className="text-indigo-600 font-black">20 pts</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">Orders placed</span>
                                    <span className="text-indigo-600 font-black">30 pts</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">Payment behavior</span>
                                    <span className="text-indigo-600 font-black">15 pts</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">Reward point usage</span>
                                    <span className="text-indigo-600 font-black">10 pts</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                            <h3 className="text-lg font-black text-slate-900 mb-6 text-center">Score Legend</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-500 shrink-0">
                                        <span className="text-emerald-700 font-black text-sm">61+</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Green Zone</h4>
                                        <p className="text-xs text-slate-500">Highly engaged & active</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-500 shrink-0">
                                        <span className="text-amber-700 font-black text-sm">31-60</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Yellow Zone</h4>
                                        <p className="text-xs text-slate-500">Needs attention & nurturing</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center border-2 border-red-500 shrink-0">
                                        <span className="text-red-700 font-black text-sm">0-30</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Red Zone</h4>
                                        <p className="text-xs text-slate-500">At risk of churning</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* 3. Advanced Filter Tab */}
            {activeSubTab === 'filter' && (
                <div className="space-y-6 animate-fade-in">
                    <Card className="p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-black text-slate-900 mb-4">Advanced Filter & Search</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">District</label>
                                <select 
                                    value={filters.district}
                                    onChange={(e) => setFilters({...filters, district: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500"
                                >
                                    <option value="">All Districts</option>
                                    <option value="Dhaka">Dhaka</option>
                                    <option value="Chittagong">Chittagong</option>
                                    <option value="Noakhali">Noakhali</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Upazila</label>
                                <select 
                                    value={filters.upazila}
                                    onChange={(e) => setFilters({...filters, upazila: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500"
                                >
                                    <option value="">All Upazilas</option>
                                    <option value="Gulshan">Gulshan</option>
                                    <option value="Halishahar">Halishahar</option>
                                    <option value="Maijdee">Maijdee</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                                <select 
                                    value={filters.category}
                                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500"
                                >
                                    <option value="">All Categories</option>
                                    {Array.from(new Set(retailers.flatMap(r => r.category || []).filter(Boolean))).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Order Status</label>
                                <select 
                                    value={filters.orderStatus}
                                    onChange={(e) => setFilters({...filters, orderStatus: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Active">Active</option>
                                    <option value="Never Ordered">Never Ordered</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Value Segment</label>
                                <select 
                                    value={filters.valueSegment}
                                    onChange={(e) => setFilters({...filters, valueSegment: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500"
                                >
                                    <option value="">All</option>
                                    {VALUE_SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Behavior Segment</label>
                                <select 
                                    value={filters.behaviorSegment}
                                    onChange={(e) => setFilters({...filters, behaviorSegment: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500"
                                >
                                    <option value="">All</option>
                                    {BEHAVIOR_SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Score Min</label>
                                <input 
                                    type="number" 
                                    placeholder="0" 
                                    value={filters.scoreMin}
                                    onChange={(e) => setFilters({...filters, scoreMin: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Score Max</label>
                                <input 
                                    type="number" 
                                    placeholder="100" 
                                    value={filters.scoreMax}
                                    onChange={(e) => setFilters({...filters, scoreMax: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500" 
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={handleClearFilters}
                                className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                            <button 
                                onClick={handleApplyFilters}
                                className="px-6 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <Search className="w-4 h-4" />
                                Apply Filters
                            </button>
                        </div>
                    </Card>

                    {/* Results */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRetailers.length > 0 ? (
                            filteredRetailers.map(retailer => (
                                <Card key={retailer.id} className="p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedRetailer(retailer); setActiveSubTab('profile'); }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-black text-slate-900 text-lg">{retailer.shopName}</h4>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                <MapPin className="w-3 h-3" /> {retailer.address || retailer.district}
                                            </p>
                                        </div>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-black text-sm ${getScoreColor(retailer.score || 0)}`}>
                                            {retailer.score || 0}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">{retailer.category?.join(', ') || 'N/A'}</span>
                                        <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md">{retailer.valueSegment || 'Medium Potential'}</span>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">{retailer.orderStatus || 'Active'}</span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRetailer(retailer);
                                                setActiveSubTab('profile');
                                            }}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                        >
                                            View Profile 360 &rarr;
                                        </button>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-500 font-bold">No retailers found matching your filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 4. 360 Profile Tab */}
            {activeSubTab === 'profile' && selectedRetailer && (
                <div className="space-y-6 animate-fade-in">
                    <button onClick={() => setActiveSubTab('filter')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                        &larr; Back to Search
                    </button>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Identity & Score */}
                        <div className="space-y-6">
                            <Card className="p-6 rounded-3xl border-0 shadow-lg shadow-slate-200/40 text-center">
                                <div className="w-24 h-24 mx-auto bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                                    <UserCircle className="w-12 h-12" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900">{selectedRetailer.shopName}</h2>
                                <p className="text-slate-500 font-medium">{selectedRetailer.ownerName} • {selectedRetailer.id}</p>
                                
                                <div className="mt-6 flex flex-col gap-2">
                                    <div className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold border border-indigo-100">
                                        {selectedRetailer.valueSegment || 'Medium Potential'}
                                    </div>
                                    <div className="px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold border border-slate-200">
                                        {selectedRetailer.behaviorSegment || 'Active Buyer'}
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 rounded-3xl border-0 shadow-lg shadow-slate-200/40">
                                <h3 className="text-lg font-black text-slate-900 mb-4 text-center">Activation Score</h3>
                                <div className="relative w-40 h-40 mx-auto mb-6">
                                    {/* Circular Gauge Mock */}
                                    <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                        <circle 
                                            cx="50" cy="50" r="40" fill="none" 
                                            stroke={getScoreGaugeColor(selectedRetailer.score || 0)} 
                                            strokeWidth="10" 
                                            strokeDasharray={`${(selectedRetailer.score || 0) * 2.51} 251`} 
                                            strokeLinecap="round"
                                            transform="rotate(-90 50 50)"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-slate-900">{selectedRetailer.score || 0}</span>
                                        <span className="text-xs font-bold text-slate-500">/ 100</span>
                                    </div>
                                </div>

                                {/* Mark Sheet */}
                                <div className="pt-6 border-t border-slate-100 space-y-3">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Score Mark Sheet</h4>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">App Login</span>
                                        <span className="font-bold text-slate-900">{selectedRetailer.scoreBreakdown?.login || 0}/25</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Browsing</span>
                                        <span className="font-bold text-slate-900">{selectedRetailer.scoreBreakdown?.browsing || 0}/20</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Orders</span>
                                        <span className="font-bold text-slate-900">{selectedRetailer.scoreBreakdown?.orders || 0}/30</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Payment</span>
                                        <span className="font-bold text-slate-900">{selectedRetailer.scoreBreakdown?.payment || 0}/15</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Rewards</span>
                                        <span className="font-bold text-slate-900">{selectedRetailer.scoreBreakdown?.rewards || 0}/10</span>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 rounded-3xl border-0 shadow-lg shadow-slate-200/40">
                                <h3 className="text-lg font-black text-slate-900 mb-4">Analytical Details</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-500">Location Ranking</span><span className="font-bold text-indigo-600">{selectedRetailer.locationRanking || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Monthly Sale</span><span className="font-bold text-slate-900">৳{(selectedRetailer.monthlySales || selectedRetailer.totalGMV || 0).toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Years in Business</span><span className="font-bold text-slate-900">{selectedRetailer.yearsInBusiness || 1} Yrs</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Shop Type</span><span className="font-bold text-slate-900">{selectedRetailer.shopType || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Shop Decor</span><span className="font-bold text-slate-900">{selectedRetailer.shopDecorType || 'N/A'}</span></div>
                                    <div className="pt-3 mt-3 border-t border-slate-50">
                                        <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-bold text-slate-900">{selectedRetailer.mobile || 'N/A'}</span></div>
                                        <div className="flex justify-between mt-2"><span className="text-slate-500">District</span><span className="font-bold text-slate-900">{selectedRetailer.district}</span></div>
                                        <div className="flex justify-between mt-2"><span className="text-slate-500">Address</span><span className="font-bold text-slate-900 text-right max-w-[150px] truncate" title={selectedRetailer.address}>{selectedRetailer.address || 'N/A'}</span></div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Right Column: Activity & History */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="p-6 rounded-3xl border-0 shadow-lg shadow-slate-200/40">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900">Payment Behavior</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">Avg. Payment Time</span>
                                            <span className="font-bold text-slate-900">2.4 Days</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">COD Success Rate</span>
                                            <span className="font-bold text-emerald-600">98%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">Credit Limit Usage</span>
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 w-[45%]"></div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 rounded-3xl border-0 shadow-lg shadow-slate-200/40">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900">Field Agent Visits</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">Last Visit</span>
                                            <span className="font-bold text-slate-900">{selectedRetailer.lastVisit || selectedRetailer.lastOrderDate || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">Agent Name</span>
                                            <span className="font-bold text-slate-900">Tariqul Islam</span>
                                        </div>
                                        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 italic">
                                            "Shop owner is interested in bulk winter clothing. Follow up next week."
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <Card className="p-6 rounded-3xl border-0 shadow-lg shadow-slate-200/40">
                                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-indigo-600" />
                                    Order History Timeline
                                </h3>
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                    {/* Timeline Item */}
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <CheckCircle className="w-4 h-4" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-slate-900">Order #ORD-892</span>
                                                <span className="text-xs font-bold text-emerald-600">Delivered</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Mar 12, 2026 • ৳12,500</p>
                                        </div>
                                    </div>
                                    
                                    {/* Timeline Item */}
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <CheckCircle className="w-4 h-4" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-slate-900">Order #ORD-754</span>
                                                <span className="text-xs font-bold text-slate-500">Delivered</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Feb 28, 2026 • ৳8,200</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Admin Panel View Tab */}
            {activeSubTab === 'table' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Premium Kanban Dashboard */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {['Active Buyer', 'Browsing Not Buying', 'Inactive'].map((segment, idx) => {
                            const segmentRetailers = filteredRetailers.filter(r => (r.behaviorSegment || 'Active Buyer') === segment);
                            const colors = [
                                { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: Activity, shadow: 'shadow-emerald-100/50' },
                                { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Clock, shadow: 'shadow-amber-100/50' },
                                { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: UserCircle, shadow: 'shadow-slate-100/50' }
                            ][idx];
                            const Icon = colors.icon;

                            return (
                                <div key={segment} className={`rounded-3xl border ${colors.border} bg-white overflow-hidden shadow-xl ${colors.shadow} flex flex-col`}>
                                    <div className={`${colors.bg} p-4 border-b ${colors.border} flex justify-between items-center`}>
                                        <div className="flex items-center gap-2">
                                            <Icon className={`w-5 h-5 ${colors.text}`} />
                                            <h4 className={`font-black ${colors.text}`}>{segment}</h4>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full bg-white text-xs font-black ${colors.text} shadow-sm`}>
                                            {segmentRetailers.length}
                                        </span>
                                    </div>
                                    <div className="p-4 flex-1 bg-slate-50/50 space-y-3 overflow-y-auto max-h-[400px]">
                                        {segmentRetailers.slice(0, 5).map(retailer => (
                                            <div key={retailer.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedRetailer(retailer); setActiveSubTab('profile'); }}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="font-bold text-slate-900 text-sm truncate pr-2">{retailer.shopName}</h5>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border font-black text-[10px] shrink-0 ${getScoreColor(retailer.score || 0)}`}>
                                                        {retailer.score || 0}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] font-bold text-slate-500">{retailer.district}</span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-600 rounded border border-slate-100">
                                                        ৳{(retailer.monthlySales || retailer.totalGMV || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {segmentRetailers.length > 5 && (
                                            <div className="text-center pt-2">
                                                <span className="text-xs font-bold text-slate-400">+{segmentRetailers.length - 5} more retailers</span>
                                            </div>
                                        )}
                                        {segmentRetailers.length === 0 && (
                                            <div className="text-center py-8">
                                                <span className="text-sm font-medium text-slate-400">No retailers in this segment</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Card className="p-0 rounded-3xl border-0 shadow-lg shadow-slate-200/40 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">All Retailers</h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <select 
                                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        value={filters.valueSegment}
                                        onChange={(e) => setFilters({...filters, valueSegment: e.target.value})}
                                    >
                                        <option value="">All Value Segments</option>
                                        {VALUE_SEGMENTS.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                                    </select>
                                    <select 
                                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        value={filters.behaviorSegment}
                                        onChange={(e) => setFilters({...filters, behaviorSegment: e.target.value})}
                                    >
                                        <option value="">All Behaviors</option>
                                        {BEHAVIOR_SEGMENTS.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                                    </select>
                                    <select 
                                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        value={filters.district}
                                        onChange={(e) => setFilters({...filters, district: e.target.value})}
                                    >
                                        <option value="">All Districts</option>
                                        {Array.from(new Set(retailers.map(r => r.district))).filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <button 
                                        onClick={handleClearFilters}
                                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleBulkReassign}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Bulk Reassign {selectedRowIds.size > 0 ? `(${selectedRowIds.size})` : ''}
                                </button>
                                <button 
                                    onClick={handleExportCSV}
                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="p-4 pl-6">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300" 
                                                checked={filteredRetailers.length > 0 && selectedRowIds.size === filteredRetailers.length}
                                                onChange={toggleAllRows}
                                            />
                                        </th>
                                        <th className="p-4 cursor-pointer hover:text-slate-600">Retailer Name <ChevronDown className="w-3 h-3 inline" /></th>
                                        <th className="p-4 cursor-pointer hover:text-slate-600">Location</th>
                                        <th className="p-4 cursor-pointer hover:text-slate-600">Value Segment</th>
                                        <th className="p-4 cursor-pointer hover:text-slate-600">Behavior Segment</th>
                                        <th className="p-4 cursor-pointer hover:text-slate-600">Score <ChevronDown className="w-3 h-3 inline" /></th>
                                        <th className="p-4 pr-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRetailers.map((retailer) => (
                                        <tr key={retailer.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4 pl-6">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-slate-300" 
                                                    checked={selectedRowIds.has(retailer.id)}
                                                    onChange={() => toggleRowSelection(retailer.id)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{retailer.shopName}</div>
                                                <div className="text-xs text-slate-500">{retailer.id}</div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">{retailer.district}</td>
                                            <td className="p-4">
                                                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">{retailer.valueSegment || 'Medium Potential'}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">{retailer.behaviorSegment || 'Active Buyer'}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-xs ${getScoreColor(retailer.score || 0)}`}>
                                                    {retailer.score || 0}
                                                </div>
                                            </td>
                                            <td className="p-4 pr-6">
                                                <button onClick={() => { setSelectedRetailer(retailer); setActiveSubTab('profile'); }} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
                            <span>Showing {filteredRetailers.length} entries</span>
                            <div className="flex gap-1">
                                <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Prev</button>
                                <button className="px-3 py-1 bg-indigo-600 text-white rounded">1</button>
                                <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Next</button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
