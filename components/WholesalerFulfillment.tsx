import React, { useState } from 'react';
import { Truck, Package, Printer, CheckCircle, Clock, MapPin, Search, Zap, ChevronRight, AlertCircle, Box, XCircle } from 'lucide-react';
import { Order, OrderStatus } from '../src/types/domain';

interface WholesalerFulfillmentProps {
    orders: Order[];
    onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export const WholesalerFulfillment: React.FC<WholesalerFulfillmentProps> = ({ orders, onUpdateStatus }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'ready' | 'shipped'>('pending');
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const myOrders = orders.filter(o => o.wholesalerName === 'Me' || o.wholesalerName === 'Mega Textiles Ltd' || o.wholesalerName === 'Unknown Wholesaler');

    const pendingOrders = myOrders.filter(o => o.status === 'Supplier Accepted' || o.status === 'Confirmed');
    const readyOrders = myOrders.filter(o => o.status === 'Label Generated' || o.status === 'Parcel is Ready');
    const shippedOrders = myOrders.filter(o => o.status === 'Dispatched' || o.status === 'Delivered' || o.status === 'Settled');

    const getDisplayedOrders = () => {
        let list = [];
        if (activeTab === 'pending') list = pendingOrders;
        if (activeTab === 'ready') list = readyOrders;
        if (activeTab === 'shipped') list = shippedOrders;
        
        if (searchQuery) {
            list = list.filter(o => o.id.toLowerCase().includes(searchQuery.toLowerCase()) || o.retailerName.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return list;
    };

    const displayedOrders = getDisplayedOrders();

    const toggleSelectAll = () => {
        if (selectedOrders.length === displayedOrders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(displayedOrders.map(o => o.id));
        }
    };

    const toggleSelectOrder = (id: string) => {
        if (selectedOrders.includes(id)) {
            setSelectedOrders(selectedOrders.filter(oId => oId !== id));
        } else {
            setSelectedOrders([...selectedOrders, id]);
        }
    };

    const handleBulkAction = (action: string) => {
        if (selectedOrders.length === 0) return;
        
        if (action === 'generate_labels') {
            selectedOrders.forEach(id => onUpdateStatus(id, 'Label Generated'));
            setSelectedOrders([]);
        } else if (action === 'mark_ready') {
            selectedOrders.forEach(id => onUpdateStatus(id, 'Parcel is Ready'));
            setSelectedOrders([]);
        } else if (action === 'dispatch') {
            selectedOrders.forEach(id => onUpdateStatus(id, 'Dispatched'));
            setSelectedOrders([]);
        }
    };

    const [showManifestModal, setShowManifestModal] = useState(false);

    const totalOrdersToday = pendingOrders.length + readyOrders.length + shippedOrders.length;
    const completedToday = shippedOrders.length;
    const progressPercentage = totalOrdersToday === 0 ? 0 : Math.round((completedToday / totalOrdersToday) * 100);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Fulfillment Hub</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Streamline your packing, labeling, and dispatch process.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                        onClick={() => setShowManifestModal(true)}
                        className="flex-1 sm:flex-none bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl font-bold hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all flex items-center justify-center gap-2 shadow-sm backdrop-blur-sm active:scale-95"
                    >
                        <Printer className="w-4 h-4" />
                        Print Manifest
                    </button>
                    <button className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 active:scale-95">
                        <Zap className="w-4 h-4" />
                        Auto-Fulfill
                    </button>
                </div>
            </div>

            {/* Daily Goal Progress */}
            <div className="bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl p-6 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Daily Fulfillment Goal</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{completedToday} of {totalOrdersToday} orders shipped today</p>
                    </div>
                    <div className="text-2xl font-black text-indigo-600">{progressPercentage}%</div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                        style={{ width: `${progressPercentage}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" style={{ transform: 'skewX(-20deg)' }}></div>
                    </div>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl p-5 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">To Pack</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{pendingOrders.length}</p>
                    </div>
                </div>
                <div className="bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl p-5 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Printer className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Labels Ready</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{readyOrders.length}</p>
                    </div>
                </div>
                <div className="bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl p-5 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">To Handover</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{readyOrders.filter(o => o.status === 'Parcel is Ready').length}</p>
                    </div>
                </div>
                <div className="bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl p-5 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Shipped</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{shippedOrders.length}</p>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden border border-gray-200/50 dark:border-gray-800/50 shadow-sm rounded-[2rem] bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl">
                {/* Tabs & Controls */}
                <div className="border-b border-gray-200/50 dark:border-gray-800/50 p-4 sm:p-6 pb-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex space-x-1 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl w-full sm:w-auto backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                            <button 
                                onClick={() => { setActiveTab('pending'); setSelectedOrders([]); }}
                                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                To Pack ({pendingOrders.length})
                            </button>
                            <button 
                                onClick={() => { setActiveTab('ready'); setSelectedOrders([]); }}
                                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'ready' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Ready to Ship ({readyOrders.length})
                            </button>
                            <button 
                                onClick={() => { setActiveTab('shipped'); setSelectedOrders([]); }}
                                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'shipped' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Shipped ({shippedOrders.length})
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search orders..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 focus:bg-white dark:focus:bg-gray-800 transition-all backdrop-blur-sm"
                                />
                            </div>
                            <button className="bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 p-2.5 rounded-xl transition-all backdrop-blur-sm active:scale-95" title="Scan Barcode">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/></svg>
                            </button>
                        </div>
                    </div>

                    {/* Bulk Actions Bar */}
                    {selectedOrders.length > 0 && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-800/50 rounded-2xl p-3 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-lg shadow-sm">{selectedOrders.length}</span>
                                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Orders Selected</span>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {activeTab === 'pending' && (
                                    <button 
                                        onClick={() => handleBulkAction('generate_labels')}
                                        className="bg-white/80 dark:bg-gray-800/80 text-indigo-700 dark:text-indigo-400 text-sm font-bold px-4 py-2 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center gap-2 shadow-sm w-full sm:w-auto justify-center backdrop-blur-sm active:scale-95"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Generate Labels
                                    </button>
                                )}
                                {activeTab === 'ready' && (
                                    <>
                                        <button 
                                            onClick={() => handleBulkAction('mark_ready')}
                                            className="bg-white/80 dark:bg-gray-800/80 text-indigo-700 dark:text-indigo-400 text-sm font-bold px-4 py-2 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center gap-2 shadow-sm flex-1 sm:flex-none justify-center backdrop-blur-sm active:scale-95"
                                        >
                                            <Box className="w-4 h-4" />
                                            Mark as Packed
                                        </button>
                                        <div className="flex items-center gap-2 flex-1 sm:flex-none">
                                            <select className="bg-white/80 dark:bg-gray-800/80 border border-indigo-200/50 dark:border-indigo-700/50 text-indigo-900 dark:text-indigo-300 text-sm font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500/50 outline-none backdrop-blur-sm">
                                                <option>Pathao Courier</option>
                                                <option>Steadfast</option>
                                                <option>RedX</option>
                                                <option>eCourier</option>
                                            </select>
                                            <button 
                                                onClick={() => handleBulkAction('dispatch')}
                                                className="bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm shadow-indigo-600/20 justify-center whitespace-nowrap active:scale-95"
                                            >
                                                <Truck className="w-4 h-4" />
                                                Handover
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Orders List */}
                <div className="bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl">
                    {displayedOrders.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center justify-center bg-gray-50/30 dark:bg-gray-800/30">
                            <div className="w-24 h-24 bg-white/80 dark:bg-gray-800/80 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                                <Package className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No orders to show</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
                                {activeTab === 'pending' ? "You're all caught up! There are no orders waiting to be packed right now." :
                                 activeTab === 'ready' ? "No orders are currently waiting for courier pickup." :
                                 "You haven't shipped any orders yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200/50 dark:divide-gray-800/50">
                            {/* Header Row */}
                            <div className="grid grid-cols-12 gap-4 p-4 px-6 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
                                <div className="col-span-1 flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedOrders.length === displayedOrders.length && displayedOrders.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-600 dark:bg-gray-700"
                                    />
                                </div>
                                <div className="col-span-3">Order Details</div>
                                <div className="col-span-3">Items</div>
                                <div className="col-span-2">Shipping Info</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-1 text-right">Action</div>
                            </div>

                            {/* Order Rows */}
                            {displayedOrders.map(order => (
                                <div key={order.id} className={`grid grid-cols-12 gap-4 p-4 px-6 items-center transition-all hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${selectedOrders.includes(order.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                    <div className="col-span-1">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedOrders.includes(order.id)}
                                            onChange={() => toggleSelectOrder(order.id)}
                                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-600 dark:bg-gray-700"
                                        />
                                    </div>
                                    
                                    <div className="col-span-3">
                                        <div className="font-black text-gray-900 dark:text-white mb-0.5">{order.id}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{order.date}</div>
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-md text-[10px] font-bold text-gray-600 dark:text-gray-300 backdrop-blur-sm">
                                            <MapPin className="w-3 h-3" />
                                            {order.retailerName}
                                        </div>
                                    </div>

                                    <div className="col-span-3">
                                        <div className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                                            {order.items?.split(', ').length || 0} Items
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                            {order.items}
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-0.5">Standard Delivery</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Pathao Courier</div>
                                        {order.trackingId && (
                                            <div className="text-[10px] font-mono mt-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md inline-block backdrop-blur-sm">
                                                {order.trackingId}
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm ${
                                            order.status === 'Supplier Accepted' || order.status === 'Confirmed' ? 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                            order.status === 'Label Generated' ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                            order.status === 'Parcel is Ready' ? 'bg-indigo-100/80 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                                            'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                        }`}>
                                            {order.status === 'Supplier Accepted' || order.status === 'Confirmed' ? <Clock className="w-3.5 h-3.5" /> :
                                             order.status === 'Label Generated' ? <Printer className="w-3.5 h-3.5" /> :
                                             order.status === 'Parcel is Ready' ? <Box className="w-3.5 h-3.5" /> :
                                             <Truck className="w-3.5 h-3.5" />}
                                            {order.status === 'Supplier Accepted' ? 'To Pack' : 
                                             order.status === 'Confirmed' ? 'To Pack' : 
                                             order.status === 'Label Generated' ? 'Label Printed' : 
                                             order.status === 'Parcel is Ready' ? 'Ready to Ship' : 
                                             order.status}
                                        </span>
                                    </div>

                                    <div className="col-span-1 flex justify-end">
                                        {activeTab === 'pending' && (
                                            <button 
                                                onClick={() => onUpdateStatus(order.id, 'Label Generated')}
                                                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all active:scale-95"
                                                title="Generate Label"
                                            >
                                                <Printer className="w-5 h-5" />
                                            </button>
                                        )}
                                        {activeTab === 'ready' && order.status === 'Label Generated' && (
                                            <button 
                                                onClick={() => onUpdateStatus(order.id, 'Parcel is Ready')}
                                                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all active:scale-95"
                                                title="Mark as Packed"
                                            >
                                                <Box className="w-5 h-5" />
                                            </button>
                                        )}
                                        {activeTab === 'ready' && order.status === 'Parcel is Ready' && (
                                            <button 
                                                onClick={() => onUpdateStatus(order.id, 'Dispatched')}
                                                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all active:scale-95"
                                                title="Handover to Courier"
                                            >
                                                <Truck className="w-5 h-5" />
                                            </button>
                                        )}
                                        {activeTab === 'shipped' && (
                                            <button 
                                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-95"
                                                title="View Details"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Print Manifest Modal */}
            {showManifestModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl rounded-[2rem] p-8 max-w-lg w-full shadow-2xl animate-scale-in border border-white/20 dark:border-gray-800/50">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Print Manifest</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Generate a daily handover manifest for couriers</p>
                            </div>
                            <button 
                                onClick={() => setShowManifestModal(false)}
                                className="p-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-2xl transition-all group active:scale-95"
                            >
                                <XCircle className="w-7 h-7 text-gray-300 dark:text-gray-600 group-hover:text-red-500 transition-colors" />
                            </button>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Courier</label>
                                <select className="w-full bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-white text-sm font-bold rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none backdrop-blur-sm transition-all">
                                    <option>Pathao Courier</option>
                                    <option>Steadfast</option>
                                    <option>RedX</option>
                                    <option>eCourier</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Date</label>
                                <input type="date" className="w-full bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-white text-sm font-bold rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none backdrop-blur-sm transition-all" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            
                            <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/50 flex items-start gap-3 mt-4 backdrop-blur-sm">
                                <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Ready to Handover</p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">You have {readyOrders.filter(o => o.status === 'Parcel is Ready').length} parcels ready for handover. The manifest will include all these parcels.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowManifestModal(false)}
                                className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all backdrop-blur-sm active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    // In a real app, this would generate a PDF
                                    setShowManifestModal(false);
                                }}
                                className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                            >
                                <Printer className="w-5 h-5" />
                                Print Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
