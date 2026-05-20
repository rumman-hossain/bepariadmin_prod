import React, { useState } from 'react';
import { Gift, Award, Plus, Settings, Save, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { RewardSettings, RewardItem, RetailerRewardsProfile, Retailer } from '../src/types/domain';

interface AdminRewardsProps {
    settings: RewardSettings;
    onUpdateSettings: (settings: RewardSettings) => void;
    rewards: RewardItem[];
    onAddReward: (reward: RewardItem) => void;
    onUpdateReward: (reward: RewardItem) => void;
    onDeleteReward: (id: string) => void;
    retailerProfiles: RetailerRewardsProfile[];
    onAdjustPoints: (retailerId: string, amount: number, type: 'Add' | 'Deduct', reason: string) => void;
    retailers: Retailer[];
    onCompleteRedemption: (transactionId: string) => void;
}

export const AdminRewards: React.FC<AdminRewardsProps> = ({
    settings,
    onUpdateSettings,
    rewards,
    onAddReward,
    onUpdateReward,
    onDeleteReward,
    retailerProfiles,
    onAdjustPoints,
    retailers,
    onCompleteRedemption
}) => {
    const [activeTab, setActiveTab] = useState<'settings' | 'rewards' | 'retailers' | 'redeemed' | 'ledger'>('settings');
    const [confirmingTransactionId, setConfirmingTransactionId] = useState<string | null>(null);
    
    // Settings State
    const [editSettings, setEditSettings] = useState<RewardSettings>(settings);
    
    // Rewards State
    const [isAddingReward, setIsAddingReward] = useState(false);
    const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
    const [newReward, setNewReward] = useState<Partial<RewardItem>>({
        type: 'Discount',
        status: 'Active'
    });

    // Retailers State
    const [selectedRetailer, setSelectedRetailer] = useState<RetailerRewardsProfile | null>(null);
    const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [adjustmentType, setAdjustmentType] = useState<'Add' | 'Deduct'>('Add');

    const handleSaveSettings = () => {
        onUpdateSettings(editSettings);
        // Show toast
    };

    const handleSaveReward = () => {
        if (editingReward) {
            onUpdateReward({ ...editingReward, ...newReward } as RewardItem);
            setEditingReward(null);
        } else {
            onAddReward({
                id: `REW-${Math.floor(Math.random() * 10000)}`,
                ...newReward
            } as RewardItem);
            setIsAddingReward(false);
        }
        setNewReward({ type: 'Discount', status: 'Active' });
    };

    const handleAdjustPoints = () => {
        if (selectedRetailer && adjustmentAmount > 0) {
            onAdjustPoints(selectedRetailer.retailerId, adjustmentAmount, adjustmentType, adjustmentReason);
            setAdjustmentAmount(0);
            setAdjustmentReason('');
            setSelectedRetailer(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-black">Reward Points System</h1>
                    <p className="text-slate-500">Manage loyalty program, rewards, and retailer points</p>
                </div>
                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        Settings
                    </button>
                    <button 
                        onClick={() => setActiveTab('rewards')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'rewards' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        Rewards Catalog
                    </button>
                    <button 
                        onClick={() => setActiveTab('retailers')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'retailers' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        Retailer Points
                    </button>
                    <button 
                        onClick={() => setActiveTab('redeemed')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'redeemed' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        Redeemed Reward
                    </button>
                    <button 
                        onClick={() => setActiveTab('ledger')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'ledger' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        Reward Ledger
                    </button>
                </div>
            </div>

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                                <Settings className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-black">Earning Rules</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Purchase Amount for 1 Point (Taka)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" min="0" 
                                        value={editSettings.earningRate}
                                        onChange={(e) => setEditSettings({...editSettings, earningRate: Number(e.target.value)})}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">BDT</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Retailers will earn 1 point for every {editSettings.earningRate} BDT spent.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Point Expiry Duration (Days)
                                </label>
                                <input 
                                    type="number" min="0" 
                                    value={editSettings.expiryDurationDays}
                                    onChange={(e) => setEditSettings({...editSettings, expiryDurationDays: Number(e.target.value)})}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                <Award className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-black">Redemption Rules</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Minimum Points to Redeem
                                </label>
                                <input 
                                    type="number" min="0" 
                                    value={editSettings.minRedeemPoints}
                                    onChange={(e) => setEditSettings({...editSettings, minRedeemPoints: Number(e.target.value)})}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Retailers must have at least this many points to start redeeming.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={handleSaveSettings}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold shadow-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rewards Catalog Tab */}
            {activeTab === 'rewards' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setIsAddingReward(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold shadow-md hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add New Reward
                        </button>
                    </div>

                    {(isAddingReward || editingReward) && (
                        <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100 dark:border-purple-900/30 animate-in slide-in-from-top-4">
                            <h3 className="text-lg font-bold text-black mb-4">
                                {editingReward ? 'Edit Reward' : 'Create New Reward'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="Reward Title (e.g. 500 BDT Discount)" 
                                    className="px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg"
                                    value={newReward.title || ''}
                                    onChange={e => setNewReward({...newReward, title: e.target.value})}
                                />
                                <input 
                                    type="number" min="0" 
                                    placeholder="Points Cost" 
                                    className="px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg"
                                    value={newReward.pointsCost || ''}
                                    onChange={e => setNewReward({...newReward, pointsCost: Number(e.target.value)})}
                                />
                                <select 
                                    className="px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg"
                                    value={newReward.type}
                                    onChange={e => setNewReward({...newReward, type: e.target.value as 'Discount' | 'Gift' | 'Cashback'})}
                                >
                                    <option value="Discount">Discount Coupon</option>
                                    <option value="Gift">Physical Gift</option>
                                    <option value="Cashback">Wallet Cashback</option>
                                </select>
                                <input 
                                    type="number" min="0" 
                                    placeholder="Value (if applicable)" 
                                    className="px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg"
                                    value={newReward.value || ''}
                                    onChange={e => setNewReward({...newReward, value: Number(e.target.value)})}
                                />
                                <textarea 
                                    placeholder="Description" 
                                    className="col-span-2 px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg h-24"
                                    value={newReward.description || ''}
                                    onChange={e => setNewReward({...newReward, description: e.target.value})}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={() => { setIsAddingReward(false); setEditingReward(null); }}
                                    className="px-4 py-2 text-slate-500 hover:text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveReward}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold"
                                >
                                    Save Reward
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {rewards.map(reward => (
                            <div key={reward.id} className="bg-white rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative group">
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingReward(reward); setNewReward(reward); }} className="p-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 hover:text-purple-600">
                                        <Settings className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this reward?')) {
                                                onDeleteReward(reward.id);
                                            }
                                        }} 
                                        className="p-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-3 rounded-lg ${reward.type === 'Gift' ? 'bg-pink-100 text-pink-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-black">{reward.title}</h4>
                                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500">{reward.type}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{reward.description}</p>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <span className="font-bold text-purple-600">{reward.pointsCost} Points</span>
                                    <span className={`text-xs font-medium ${reward.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {reward.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Retailer Points Management Tab */}
            {activeTab === 'retailers' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Retailer ID</th>
                                    <th className="px-6 py-4 font-medium">Total Earned</th>
                                    <th className="px-6 py-4 font-medium">Redeemed</th>
                                    <th className="px-6 py-4 font-medium">Current Balance</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {retailerProfiles.map(profile => {
                                    const retailer = retailers.find(r => r.id === profile.retailerId);
                                    return (
                                        <tr key={profile.retailerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-black">{retailer?.shopName || 'Unknown Shop'}</p>
                                                    <p className="text-xs text-slate-500">{profile.retailerId}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-emerald-600 font-bold">+{profile.totalPointsEarned}</td>
                                            <td className="px-6 py-4 text-orange-600 font-bold">-{profile.totalPointsRedeemed}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-bold">
                                                    {profile.currentBalance} pts
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedRetailer(profile)}
                                                    className="text-purple-600 hover:text-purple-700 font-medium text-xs border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50"
                                                >
                                                    Manage Points
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Manual Adjustment Modal */}
                    {selectedRetailer && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                                <h3 className="text-lg font-bold text-black mb-4">
                                    Adjust Points for {selectedRetailer.retailerId}
                                </h3>
                                
                                <div className="flex gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                                    <button 
                                        onClick={() => setAdjustmentType('Add')}
                                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${adjustmentType === 'Add' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                                    >
                                        Add Points
                                    </button>
                                    <button 
                                        onClick={() => setAdjustmentType('Deduct')}
                                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${adjustmentType === 'Deduct' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
                                    >
                                        Deduct Points
                                    </button>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Amount</label>
                                        <input 
                                            type="number" min="0" 
                                            value={adjustmentAmount}
                                            onChange={e => setAdjustmentAmount(Number(e.target.value))}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Reason / Note</label>
                                        <input 
                                            type="text" 
                                            value={adjustmentReason}
                                            onChange={e => setAdjustmentReason(e.target.value)}
                                            placeholder="e.g. Bonus for loyalty"
                                            className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => setSelectedRetailer(null)}
                                        className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleAdjustPoints}
                                        className={`px-6 py-2 text-white rounded-lg font-bold shadow-lg ${adjustmentType === 'Add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                                    >
                                        Confirm {adjustmentType}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Redeemed Rewards Tab */}
            {activeTab === 'redeemed' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Retailer</th>
                                    <th className="px-6 py-4 font-medium">Reward</th>
                                    <th className="px-6 py-4 font-medium">Points Cost</th>
                                    <th className="px-6 py-4 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {retailerProfiles.flatMap(profile => 
                                    profile.transactions
                                        .filter(t => t.type === 'Redeemed')
                                        .map(t => {
                                            const retailer = retailers.find(r => r.id === profile.retailerId);
                                            return { ...t, retailer };
                                        })
                                )
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(transaction => (
                                    <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500">{transaction.date}</td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-black">{transaction.retailer?.shopName || 'Unknown Shop'}</p>
                                                <p className="text-xs text-slate-500">{transaction.retailerId}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-black">
                                            {transaction.description.replace('Redeemed: ', '')}
                                        </td>
                                        <td className="px-6 py-4 text-orange-600 font-bold">
                                            {Math.abs(transaction.amount)} pts
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {transaction.status === 'Completed' ? (
                                                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold flex items-center justify-end gap-1 w-fit ml-auto">
                                                    <CheckCircle className="w-3 h-3" /> Completed
                                                </span>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-bold">
                                                        Redeemed
                                                    </span>
                                                    <button
                                                        onClick={() => setConfirmingTransactionId(transaction.id)}
                                                        className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                                                    >
                                                        Mark as Reward sent
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {retailerProfiles.flatMap(p => p.transactions.filter(t => t.type === 'Redeemed')).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            No rewards redeemed yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Reward Ledger Tab */}
            {activeTab === 'ledger' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-black">Reward Payment Ledger</h3>
                            <p className="text-slate-500 text-sm">History of all rewards marked as sent</p>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Retailer</th>
                                    <th className="px-6 py-4 font-medium">Reward</th>
                                    <th className="px-6 py-4 font-medium">Points Cost</th>
                                    <th className="px-6 py-4 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {retailerProfiles.flatMap(profile => 
                                    profile.transactions
                                        .filter(t => t.type === 'Redeemed' && t.status === 'Completed')
                                        .map(t => {
                                            const retailer = retailers.find(r => r.id === profile.retailerId);
                                            return { ...t, retailer };
                                        })
                                )
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(transaction => (
                                    <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500">{transaction.date}</td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-black">{transaction.retailer?.shopName || 'Unknown Shop'}</p>
                                                <p className="text-xs text-slate-500">{transaction.retailerId}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-black">
                                            {transaction.description.replace('Redeemed: ', '')}
                                        </td>
                                        <td className="px-6 py-4 text-orange-600 font-bold">
                                            {Math.abs(transaction.amount)} pts
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold flex items-center justify-end gap-1 w-fit ml-auto">
                                                <CheckCircle className="w-3 h-3" /> Sent
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {retailerProfiles.flatMap(p => p.transactions.filter(t => t.type === 'Redeemed' && t.status === 'Completed')).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            No sent rewards found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmingTransactionId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 text-amber-600">
                            <AlertCircle className="w-6 h-6" />
                            <h3 className="text-lg font-bold text-black">Confirm Action</h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Are you sure you want to mark this reward as sent? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setConfirmingTransactionId(null)}
                                className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    onCompleteRedemption(confirmingTransactionId);
                                    setConfirmingTransactionId(null);
                                }}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold shadow-lg hover:bg-purple-700"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
