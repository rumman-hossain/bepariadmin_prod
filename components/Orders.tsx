import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Order, OrderStatus } from '../src/types/domain';
import { Truck, CheckCircle, Clock, XCircle, Share, RefreshCw, Ban, Package, ArrowLeft, Download } from 'lucide-react';

interface OrdersProps {
    orders: Order[];
    onUpdateStatus: (orderId: string, status: OrderStatus, data?: unknown) => void;
    onDeleteOrder?: (orderId: string) => void;
    retailers?: import('../types').Retailer[];
}

const steps = [
  { id: 'pending', label: 'Pending', status: 'Created' },
  { id: 'supplier', label: 'Pending Supplier', status: 'Pending Supplier Response' },
  { id: 'accepted', label: 'Accepted', status: 'Supplier Accepted' },
  { id: 'dispatched', label: 'Shipped', status: 'Dispatched' },
  { id: 'completed', label: 'Completed', status: 'Delivered' },
  { id: 'rejected', label: 'Rejected', status: 'Rejected' },
];

export const Orders: React.FC<OrdersProps> = ({ orders, onUpdateStatus, onDeleteOrder, retailers = [] }) => {
  const [activeStep, setActiveStep] = useState<string>('pending');
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<Order | null>(null);
  const [viewingOrderItems, setViewingOrderItems] = useState<Order | null>(null);
  const [codAmount, setCodAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [collectAdvance, setCollectAdvance] = useState(true);
  const [collectShipping, setCollectShipping] = useState(true);
  const [advanceReceived, setAdvanceReceived] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const filteredOrders = activeStep === 'all' 
      ? orders 
      : orders.filter(o => {
          if (activeStep === 'pending') return o.status === 'Created' || o.status === 'Awaiting Partial Payment' || o.status === 'Payment Verified';
          if (activeStep === 'supplier') return o.status === 'Pending Supplier Response';
          if (activeStep === 'accepted') return o.status === 'Supplier Accepted' || o.status === 'Confirmed' || o.status === 'Label Generated' || o.status === 'Parcel is Ready';
          if (activeStep === 'dispatched') return o.status === 'Dispatched';
          if (activeStep === 'completed') return o.status === 'Delivered' || o.status === 'Settled';
          if (activeStep === 'rejected') return o.status === 'Rejected' || o.status === 'Cancelled' || o.status === 'Refunded';
          return true;
      });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
      if (sortBy === 'date') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
          return b.amount - a.amount;
      }
  });

  const getStepCount = (stepId: string) => {
      return orders.filter(o => {
          if (stepId === 'pending') return o.status === 'Created' || o.status === 'Awaiting Partial Payment' || o.status === 'Payment Verified';
          if (stepId === 'supplier') return o.status === 'Pending Supplier Response';
          if (stepId === 'accepted') return o.status === 'Supplier Accepted' || o.status === 'Confirmed' || o.status === 'Label Generated' || o.status === 'Parcel is Ready';
          if (stepId === 'dispatched') return o.status === 'Dispatched';
          if (stepId === 'completed') return o.status === 'Delivered' || o.status === 'Settled';
          if (stepId === 'rejected') return o.status === 'Rejected' || o.status === 'Cancelled' || o.status === 'Refunded';
          return false;
      }).length;
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-black">Order Control Engine</h1>
          <p className="text-slate-500 dark:text-slate-400">Live order pipeline and settlement</p>
        </div>

        {/* Pipeline Visualization */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {steps.map((step, idx) => (
                <div 
                    key={step.id} 
                    onClick={() => setActiveStep(step.id)}
                    className="relative group cursor-pointer"
                >
                    <div className={`p-4 rounded-xl border transition-all duration-300 ${activeStep === step.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/30 scale-105' : 'bg-white border-slate-200 dark:border-slate-700 hover:border-emerald-400'}`}>
                        <div className="flex justify-between items-start">
                            <span className={`text-xs font-bold uppercase tracking-wider ${activeStep === step.id ? 'text-emerald-100' : 'text-slate-400'}`}>{step.label}</span>
                            <span className={`text-lg font-bold ${activeStep === step.id ? 'text-white' : 'text-black'}`}>{getStepCount(step.id)}</span>
                        </div>
                    </div>
                    {/* Connector line for desktop */}
                    {idx < steps.length - 1 && (
                        <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-slate-200 dark:bg-slate-700 -z-10" />
                    )}
                </div>
            ))}
        </div>

        <Card 
            title={`${steps.find(s => s.id === activeStep)?.label || 'All'} Orders`}
            action={
                <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="date">Sort by Date (Recent First)</option>
                    <option value="amount">Sort by Amount (High to Low)</option>
                </select>
            }
        >
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Date & Time</th>
                            <th className="px-6 py-4">Retailer (Buyer)</th>
                            <th className="px-6 py-4">Wholesaler (Seller)</th>
                            <th className="px-6 py-4">Items</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                                    No orders found in this stage.
                                </td>
                            </tr>
                        ) : (
                            sortedOrders.map((order) => (
                                <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-semibold text-emerald-600">{order.id}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {order.date}
                                        {order.logs && order.logs.length > 0 && (
                                            <div className="text-xs text-slate-400 mt-1">
                                                {new Date(order.logs[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-black">{order.retailerName}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-black">{order.wholesalerName}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                            {order.items?.split(', ').map((item, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => setViewingOrderItems(order)}
                                                    className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-white text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
                                                    title="Click to view all items"
                                                >
                                                    <Package className="w-3 h-3 mr-1 text-emerald-500" />
                                                    {item}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">৳{order.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {order.status === 'Delivered' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                            {order.status === 'Pending Supplier Response' && <Clock className="w-4 h-4 text-yellow-500" />}
                                            {order.status === 'Dispatched' && <Truck className="w-4 h-4 text-blue-500" />}
                                            {order.status === 'Parcel is Ready' && <Package className="w-4 h-4 text-blue-500" />}
                                            {(order.status === 'Cancelled' || order.status === 'Rejected') && <XCircle className="w-4 h-4 text-red-500" />}
                                            <span className={`text-sm ${
                                                order.status === 'Delivered' ? 'text-emerald-700' :
                                                order.status === 'Pending Supplier Response' ? 'text-yellow-700' :
                                                (order.status === 'Cancelled' || order.status === 'Rejected') ? 'text-red-700' : 'text-blue-700'
                                            }`}>{order.status === 'Dispatched' ? 'Shipped' : order.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {/* Action Buttons based on Status */}
                                        {order.status === 'Created' && (
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setConfirmingOrder(order);
                                                        setPaymentMethod('');
                                                        setCollectAdvance(true);
                                                        setCollectShipping(true);
                                                    }}
                                                    className="text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 w-full"
                                                >
                                                    Confirm & Send to Supplier
                                                </button>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => onUpdateStatus(order.id, 'Rejected')}
                                                        className="flex-1 text-white bg-red-600 hover:bg-red-700 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                                    >
                                                        <XCircle className="w-3 h-3" /> Reject
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeleteOrder && onDeleteOrder(order.id)}
                                                        className="flex-1 text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                                    >
                                                        <Ban className="w-3 h-3" /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {order.status === 'Supplier Accepted' && (
                                            <button 
                                                onClick={() => onUpdateStatus(order.id, 'Label Generated')}
                                                className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 w-full"
                                            >
                                                <Truck className="w-3 h-3" /> Get & Send Shipping Label
                                            </button>
                                        )}

                                        {order.status === 'Label Generated' && (
                                            <div className="flex flex-col gap-2">
                                                <a 
                                                    href={order.shippingLabelUrl || '#'}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 w-full border border-indigo-200 dark:border-indigo-800"
                                                >
                                                    View Steadfast Label
                                                </a>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center">
                                                    Sent to Supplier
                                                </span>
                                            </div>
                                        )}

                                        {order.status === 'Dispatched' && (
                                            <div className="flex flex-col gap-2">
                                                {order.shippingMedium && order.trackingId && (
                                                    <div className="text-left text-xs bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-100 dark:border-blue-800/30">
                                                        <div className="font-bold text-blue-700 dark:text-blue-400 mb-1">Courier Info</div>
                                                        <div className="text-slate-600 dark:text-slate-300"><span className="font-medium">Via:</span> {order.shippingMedium}</div>
                                                        <div className="text-slate-600 dark:text-slate-300"><span className="font-medium">ID:</span> {order.trackingId}</div>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        setReceivingOrder(order);
                                                        const shipping = 150;
                                                        const subtotal = order.amount - shipping;
                                                        const safeSubtotal = Math.max(0, subtotal);
                                                        const defaultAdvance = Math.round(safeSubtotal * 0.1) + shipping;
                                                        setAdvanceReceived(defaultAdvance);
                                                        setCodAmount(order.amount - defaultAdvance);
                                                    }}
                                                    className="text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 w-full"
                                                >
                                                    <CheckCircle className="w-3 h-3" /> Mark as Received
                                                </button>
                                            </div>
                                        )}

                                        {(order.status === 'Rejected' || order.status === 'Cancelled') && (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onUpdateStatus(order.id, 'Auto-Reassigned')}
                                                    className="flex-1 text-white bg-blue-600 hover:bg-blue-700 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                                    title="Redirect to another supplier"
                                                >
                                                    <Share className="w-3 h-3" /> Redirect
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateStatus(order.id, 'Refunded')}
                                                    className="flex-1 text-white bg-red-600 hover:bg-red-700 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                                    title="Refund Order"
                                                >
                                                    <RefreshCw className="w-3 h-3" /> Refund
                                                </button>
                                            </div>
                                        )}

                                        {order.status === 'Refunded' && (
                                            <span className="text-xs font-bold text-gray-400">Refund Processed</span>
                                        )}
                                        
                                        {['Dispatched', 'Delivered', 'Pending Supplier Response'].includes(order.status) && (
                                            <button className="text-slate-500 hover:text-emerald-600 font-medium text-sm">View Details</button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>

        {/* Order Items Modal */}
        {viewingOrderItems && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl animate-scale-in border border-white/10">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-black tracking-tight">Order Inventory</h3>
                            <p className="text-sm text-slate-500 font-medium">Detailed breakdown of products in this shipment</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    import('jspdf').then(({ default: jsPDF }) => {
                                        import('jspdf-autotable').then(({ default: autoTable }) => {
                                            const doc = new jsPDF();
                                            doc.setFontSize(20);
                                            doc.text('Order Inventory', 14, 22);
                                            doc.setFontSize(11);
                                            doc.setTextColor(100);
                                            doc.text(`Order ID: ${viewingOrderItems.id}`, 14, 30);
                                            doc.text(`Date: ${viewingOrderItems.date}`, 14, 36);
                                            doc.text(`Wholesaler: ${viewingOrderItems.wholesalerName}`, 14, 42);

                                            const tableData = viewingOrderItems.items?.split(', ').map((item, idx) => {
                                                const [qty, ...nameParts] = item.split('x ');
                                                const name = nameParts.join('x ');
                                                return [idx + 1, name, qty, `SKU-${viewingOrderItems.id}-${idx + 1}`];
                                            }) || [];

                                            autoTable(doc, {
                                                startY: 50,
                                                head: [['#', 'Product Name', 'Quantity', 'SKU']],
                                                body: tableData,
                                                theme: 'striped',
                                                headStyles: { fillStyle: [16, 185, 129] } // emerald-500
                                            });

                                            doc.save(`Order_${viewingOrderItems.id}_Items.pdf`);
                                        });
                                    });
                                }}
                                className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm"
                                title="Download PDF"
                            >
                                <Download className="w-5 h-5" />
                                PDF
                            </button>
                            <button 
                                onClick={() => setViewingOrderItems(null)}
                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all group"
                            >
                                <XCircle className="w-7 h-7 text-slate-300 group-hover:text-red-500 transition-colors" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Order Reference</p>
                            <p className="text-lg font-bold text-emerald-600">{viewingOrderItems.id}</p>
                        </div>
                        <div className="bg-white/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Wholesaler</p>
                            <p className="text-lg font-bold text-black truncate">{viewingOrderItems.wholesalerName}</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 mb-8 custom-scrollbar">
                        {viewingOrderItems.items?.split(', ').map((item, idx) => {
                            const [qty, ...nameParts] = item.split('x ');
                            const name = nameParts.join('x ');
                            return (
                                <div key={idx} className="group flex items-center justify-between p-5 bg-white border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Package className="w-7 h-7 text-emerald-600" />
                                        </div>
                                        <div>
                                            <div className="text-lg font-black text-black leading-tight">{name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">SKU: {viewingOrderItems.id}-{idx+1}</span>
                                                <span className="text-sm font-bold text-emerald-600">Quantity: {qty}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
                                        <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase">Verified</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-slate-400 text-xs font-medium">
                            Total Items: <span className="text-black font-bold">{viewingOrderItems.items?.split(', ').length}</span>
                        </div>
                        <button 
                            onClick={() => setViewingOrderItems(null)}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-4 rounded-2xl font-black hover:opacity-90 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/20 dark:shadow-white/10 active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Engine
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Confirmation Modal */}
        {confirmingOrder && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
                    <h3 className="text-xl font-bold text-black mb-4">Confirm Order & Payment</h3>
                    
                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 mb-1">Order ID</p>
                                <p className="font-bold text-black">{confirmingOrder.id}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                                <p className="font-bold text-black">৳{confirmingOrder.amount.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Retailer Info */}
                        {(() => {
                            const retailer = retailers.find(r => r.id === confirmingOrder.retailerId);
                            if (!retailer) return null;
                            return (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Retailer Details</p>
                                            <p className="font-bold text-black">{retailer.shopName}</p>
                                            <p className="text-sm text-slate-600">{retailer.ownerName}</p>
                                        </div>
                                        {retailer.mobile && (
                                            <a 
                                                href={`tel:${retailer.mobile}`}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                Call
                                            </a>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-600 flex flex-col gap-1 mt-2">
                                        {retailer.mobile && <span className="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> {retailer.mobile}</span>}
                                        {retailer.address && <span className="flex items-start gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg> <span className="flex-1">{retailer.address}</span></span>}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={collectAdvance}
                                            onChange={(e) => setCollectAdvance(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">10% Advance of Product Price</span>
                                    </label>
                                    <span className="font-bold text-black">৳{Math.round(confirmingOrder.amount * 0.1).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={collectShipping}
                                            onChange={(e) => setCollectShipping(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Shipping Cost</span>
                                    </label>
                                    <span className="font-bold text-black">৳150</span>
                                </div>
                                <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Total to Collect</span>
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-500">
                                        ৳{((collectAdvance ? Math.round(confirmingOrder.amount * 0.1) : 0) + (collectShipping ? 150 : 0)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-3">
                                Please verify this amount has been received from the retailer.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method <span className="text-red-500">*</span></label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                                >
                                    <option value="">Select Payment Method</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Bkash">Bkash</option>
                                    <option value="Nagad">Nagad</option>
                                    <option value="Bank">Bank</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transaction ID (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. TRX982739182"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black placeholder:text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Document (Optional)</label>
                                <input 
                                    type="file" 
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setConfirmingOrder(null)}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                if (!paymentMethod) return;
                                // Calculate collected amounts
                                const advanceAmount = collectAdvance ? Math.round(confirmingOrder.amount * 0.1) : 0;
                                const shippingAmount = collectShipping ? 150 : 0;
                                
                                // We need to pass these values up. 
                                // Since onUpdateStatus only takes status, we might need to modify the parent or 
                                // assume onUpdateStatus can handle an optional object with extra data, 
                                // OR we modify the order object locally before calling update if the parent state is managed there.
                                // However, looking at the code, onUpdateStatus is a prop.
                                // Let's check the interface for OrdersProps.
                                onUpdateStatus(confirmingOrder.id, 'Pending Supplier Response', {
                                    collectedAdvance: advanceAmount,
                                    collectedShipping: shippingAmount
                                });
                                setConfirmingOrder(null);
                            }}
                            disabled={!paymentMethod}
                            className={`flex-1 py-3 font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/30 ${
                                !paymentMethod 
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                        >
                            Confirm & Send
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Receiving Modal */}
        {receivingOrder && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
                    <h3 className="text-xl font-bold text-black mb-4">Mark as Received</h3>
                    
                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">Order ID</p>
                                <p className="font-bold text-black">{receivingOrder.id}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                                <p className="font-bold text-black">৳{receivingOrder.amount.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Advance Payment Received (৳)</label>
                                <input 
                                    type="number" min="0" 
                                    value={advanceReceived}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setAdvanceReceived(val);
                                        setCodAmount(receivingOrder.amount - val);
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">COD Payment Received (৳)</label>
                                <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black font-bold">
                                    ৳{codAmount.toLocaleString()}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Calculated as Total Amount - Advance Payment Received</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setReceivingOrder(null)}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                onUpdateStatus(receivingOrder.id, 'Delivered');
                                setReceivingOrder(null);
                            }}
                            className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/30"
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