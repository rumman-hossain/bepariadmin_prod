import React, { useState, useEffect } from 'react';
import { Truck, Save, Plus, Trash2, Info, AlertCircle, CheckCircle2, Package, Printer, Send } from 'lucide-react';
import { logisticsService } from '../services/logisticsService';
import { auth } from '../firebase';
import { ShippingRate, Order, OrderStatus, Wholesaler, Retailer } from '../types';

interface AdminLogisticsProps {
  orders?: Order[];
  onUpdateStatus?: (orderId: string, status: OrderStatus, data?: unknown) => void;
  wholesalers?: Wholesaler[];
  retailers?: Retailer[];
}

export const AdminLogistics: React.FC<AdminLogisticsProps> = ({ orders = [], onUpdateStatus, wholesalers = [], retailers = [] }) => {
  const [activeView, setActiveView] = useState<'logistics' | 'packet'>('packet');
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Packet Management State
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [shippingMedium, setShippingMedium] = useState('');
  const [trackingId, setTrackingId] = useState('');

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      if (!auth.currentUser) {
        setMessage({ type: 'error', text: 'Please sign in to manage shipping rates.' });
        return;
      }
      await logisticsService.initializeDefaultRates();
      const data = await logisticsService.getShippingRates();
      setRates(data);
    } catch (error) {
      console.error('Error loading rates:', error);
      let errorMsg = 'Failed to load shipping rates.';
      try {
        if (error instanceof Error) {
            const parsed = JSON.parse(error.message);
            if (parsed.error && parsed.error.includes('insufficient permissions')) {
              errorMsg = 'Permission denied. Only admins can manage shipping rates.';
            }
        }
      } catch {
        // Ignore parse error
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (id: string, field: keyof ShippingRate, value: string | number) => {
    setRates(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setMessage(null);
      for (const rate of rates) {
        await logisticsService.saveShippingRate(rate);
      }
      setMessage({ type: 'success', text: 'Shipping rates updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving rates:', error);
      setMessage({ type: 'error', text: 'Failed to save shipping rates.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddRate = () => {
    const newRate: ShippingRate = {
      id: `temp-${Date.now()}`,
      maxWeight: 0,
      price: 0,
      updatedAt: new Date().toISOString()
    };
    setRates(prev => [...prev, newRate].sort((a, b) => a.maxWeight - b.maxWeight));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            Logistics & Packet Management
          </h1>
          <p className="text-slate-500">Manage shipping rates and courier handoffs</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('packet')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeView === 'packet' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Packet Management System
          </button>
          <button
            onClick={() => setActiveView('logistics')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeView === 'logistics' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Logistics Module
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {activeView === 'packet' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-black flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Parcel is Ready
              </h2>
              <p className="text-sm text-slate-500 mt-1">Orders ready to be handed over to the courier.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Label</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.filter(o => o.status === 'Parcel is Ready').length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No parcels are currently ready for courier handoff.
                      </td>
                    </tr>
                  ) : (
                    orders.filter(o => o.status === 'Parcel is Ready').map((order) => {
                      const wholesaler = wholesalers.find(w => w.companyName === order.wholesalerName);
                      const retailer = retailers.find(r => r.id === order.retailerId);
                      
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-emerald-600 align-top">{order.id}</td>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-black">{order.wholesalerName}</div>
                            {wholesaler && (
                              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                {wholesaler.mobile && <div>📞 {wholesaler.mobile}</div>}
                                {wholesaler.address && <div>📍 {wholesaler.address}</div>}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-black">{order.retailerName}</div>
                            {retailer && (
                              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                {retailer.mobile && <div>📞 {retailer.mobile}</div>}
                                {retailer.address && <div>📍 {retailer.address}</div>}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <a 
                              href={order.shippingLabelUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              <Printer className="w-4 h-4" /> View PDF
                            </a>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <button 
                              onClick={() => {
                                setConfirmingOrder(order);
                                setShippingMedium('');
                                setTrackingId('');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                            >
                              <Send className="w-4 h-4" /> Mark as Sent to Courier
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'logistics' && (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-black">Shipping Price Configurator</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAddRate}
                className="text-sm text-emerald-600 font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-4 h-4" /> Add Bracket
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Weight Bracket (Max Kg)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price (BDT)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0"
                          value={rate.maxWeight}
                          onChange={(e) => handleRateChange(rate.id, 'maxWeight', parseFloat(e.target.value))}
                          className="w-24 bg-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-black focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <span className="text-sm text-slate-500">kg</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">৳</span>
                        <input
                          type="number" min="0"
                          value={rate.price}
                          onChange={(e) => handleRateChange(rate.id, 'price', parseFloat(e.target.value))}
                          className="w-32 bg-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-black focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(rate.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-white/30 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-3 items-start">
              <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p className="font-bold text-black mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Shipping price is calculated based on the total weight of the cart.</li>
                  <li>The system finds the smallest bracket that fits the total weight.</li>
                  <li>Product weight is automatically extracted from descriptions (e.g., "5kg", "500g").</li>
                  <li>These prices are applied automatically at checkout for all districts from Dhaka.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-black">Confirm Dispatch</h3>
              <p className="text-sm text-slate-500 mt-1">Order {confirmingOrder.id}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Shipping Medium Name</label>
                <input 
                  type="text" 
                  value={shippingMedium}
                  onChange={(e) => setShippingMedium(e.target.value)}
                  placeholder="e.g., Pathao, Steadfast, RedX"
                  className="w-full bg-white border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-black focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tracking ID</label>
                <input 
                  type="text" 
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="e.g., P-123456789"
                  className="w-full bg-white border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-black focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="p-6 bg-white/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setConfirmingOrder(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (onUpdateStatus) {
                    onUpdateStatus(confirmingOrder.id, 'Dispatched', { shippingMedium, trackingId });
                  }
                  setConfirmingOrder(null);
                  setMessage({ type: 'success', text: `Order ${confirmingOrder.id} marked as dispatched.` });
                  setTimeout(() => setMessage(null), 3000);
                }}
                disabled={!shippingMedium || !trackingId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
