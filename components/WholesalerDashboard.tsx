import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, Clock, Award, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Order, Product, Wholesaler } from '../src/types/domain';

interface WholesalerDashboardProps {
  orders: Order[];
  products: Product[];
  wholesaler?: Wholesaler;
}

export const WholesalerDashboard: React.FC<WholesalerDashboardProps> = ({ orders, products, wholesaler }) => {
  const wholesalerOrders = useMemo(() => {
    if (!wholesaler) return [];
    return orders.filter(o => o.wholesalerName === wholesaler.companyName || o.wholesalerName === 'Me');
  }, [orders, wholesaler]);

  const kpis = useMemo(() => {
    const totalSales = wholesalerOrders.reduce((sum, order) => sum + (order.baseCost || order.amount), 0);
    const pendingOrders = wholesalerOrders.filter(o => o.status === 'Pending Supplier Response').length;
    const activeProducts = products.filter(p => p.status === 'Approved' || p.status === 'Out of Stock').length;
    
    // Calculate fulfillment rate (mocked trend for now or calculated if we had historical data)
    const fulfilledOrders = wholesalerOrders.filter(o => o.status === 'Delivered' || o.status === 'Dispatched').length;
    const fulfillmentRate = wholesalerOrders.length > 0 ? Math.round((fulfilledOrders / wholesalerOrders.length) * 100) : 0;

    return [
      { label: 'Total Sales', value: totalSales.toLocaleString(), trend: 15.2, isCurrency: true },
      { label: 'Pending Orders', value: pendingOrders.toString(), trend: -2.4 },
      { label: 'Active Products', value: activeProducts.toString(), trend: 8.1 },
      { label: 'Fulfillment Rate', value: `${fulfillmentRate}%`, trend: 1.2 },
    ];
  }, [wholesalerOrders, products]);

  const chartDataSales = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthlyData[months[d.getMonth()]] = 0;
    }

    wholesalerOrders.forEach(order => {
      const orderDate = new Date(order.date);
      const monthName = months[orderDate.getMonth()];
      if (monthlyData[monthName] !== undefined) {
        monthlyData[monthName] += (order.baseCost || order.amount);
      }
    });

    return Object.entries(monthlyData).map(([name, value]) => ({ name, value }));
  }, [wholesalerOrders]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.availableStock < (p.moq * 2)); // Example threshold
  }, [products]);
  return (
    <div className="space-y-8 animate-fade-in pb-32 md:pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Supplier Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {wholesaler?.companyName || 'Supplier'}.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-700 dark:text-blue-300 rounded-2xl text-sm font-semibold border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-md">
            <Award className="w-4 h-4" />
            <span>Top Rated Supplier</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="relative overflow-hidden bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                {idx === 0 && <DollarSign className="w-24 h-24 text-blue-500 dark:text-blue-400" />}
                {idx === 1 && <Clock className="w-24 h-24 text-indigo-500 dark:text-indigo-400" />}
                {idx === 2 && <Package className="w-24 h-24 text-purple-500 dark:text-purple-400" />}
                {idx === 3 && <Award className="w-24 h-24 text-emerald-500 dark:text-emerald-400" />}
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl border ${
                  idx === 0 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                  idx === 1 ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                  idx === 2 ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  {idx === 0 && <DollarSign className="w-6 h-6" />}
                  {idx === 1 && <Clock className="w-6 h-6" />}
                  {idx === 2 && <Package className="w-6 h-6" />}
                  {idx === 3 && <Award className="w-6 h-6" />}
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg border ${kpi.trend >= 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                  {kpi.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(kpi.trend)}%
                </div>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider">{kpi.label}</p>
                <h3 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                  {kpi.isCurrency ? '৳' : ''}{kpi.value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Action Required Section */}
        <div className="lg:col-span-1 bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-[2rem] p-6 shadow-sm flex flex-col h-[450px] lg:h-auto">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-6">Action Required</h3>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {wholesalerOrders.filter(o => o.status === 'Pending Supplier Response').map(order => (
                    <div key={order.id} className="p-5 bg-white/80 dark:bg-black/20 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-lg border border-red-500/20">Expires in {order.deadline || '24h'}</span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs font-mono bg-gray-100/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-md">{order.id}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">{order.items || 'Multiple Items'}</h4>
                        <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50">
                            <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">৳{(order.baseCost || order.amount).toLocaleString()}</span>
                            <button className="text-sm bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30 active:scale-95">
                                Review
                            </button>
                        </div>
                    </div>
                ))}
                {wholesalerOrders.filter(o => o.status === 'Pending Supplier Response').length === 0 && (
                  <div className="p-8 bg-gray-50/50 dark:bg-gray-800/20 border border-dashed border-gray-200/50 dark:border-gray-800/50 rounded-[2rem] text-center text-gray-500 dark:text-gray-400 text-sm font-medium">
                    No pending orders require your response.
                  </div>
                )}
                
                {lowStockProducts.length > 0 && (
                  <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-[2rem] flex items-start gap-4 mt-4">
                      <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                      <div>
                          <h5 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">Low Stock Alert</h5>
                          <p className="text-xs text-yellow-700/90 dark:text-yellow-500/80 mt-1.5 leading-relaxed">{lowStockProducts.length} Products are running low on inventory.</p>
                      </div>
                  </div>
                )}
            </div>
        </div>

        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-[2rem] p-6 shadow-sm h-[450px] flex flex-col">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-6">Order Volume Trend</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataSales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                  <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeOpacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `৳${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)' }}
                    itemStyle={{ color: '#111827', fontWeight: 600 }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBlue)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
              </AreaChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};