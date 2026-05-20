import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { 
  TrendingUp, Users, ShoppingBag, DollarSign, Activity, AlertTriangle, 
  Clock, RefreshCw, ShoppingCart, Package, Search, Truck,
  ShieldAlert, CheckCircle, Download
} from 'lucide-react';
import { 
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Order, Retailer, Wholesaler, Product, PaymentRecord } from '../types';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b'];

interface AdminAnalyticsProps {
  orders: Order[];
  retailers: Retailer[];
  wholesalers: Wholesaler[];
  products: Product[];
  payments: PaymentRecord[];
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ orders, retailers, wholesalers, products, payments }) => {
  const [activeTab, setActiveTab] = useState('executive');

  // Calculations
  const today = useMemo(() => new Date(), []);
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const totalGMV = orders.reduce((sum, o) => sum + o.amount, 0);
  const activeBuyers = retailers.filter(r => r.status === 'Active').length;
  const activeSellers = wholesalers.filter(w => w.status === 'Active').length;
  const ordersToday = orders.filter(o => o.date.startsWith(todayStr)).length;
  const ordersYesterday = orders.filter(o => o.date.startsWith(yesterdayStr)).length;
  const orderGrowth = ordersYesterday ? ((ordersToday - ordersYesterday) / ordersYesterday) * 100 : 0;

  const revenueData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayOrders = orders.filter(o => o.date.startsWith(date));
      const revenue = dayOrders.reduce((sum, o) => sum + o.amount, 0);
      
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 7);
      const prevDateString = prevDate.toISOString().split('T')[0];
      const prevDayOrders = orders.filter(o => o.date.startsWith(prevDateString));
      const prevRevenue = prevDayOrders.reduce((sum, o) => sum + o.amount, 0);

      return {
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        today: revenue,
        yesterday: prevRevenue
      };
    });
  }, [orders, today]);

  const orderFunnelData = useMemo(() => {
    return [
      { name: 'Placed', value: orders.length },
      { name: 'Confirmed', value: orders.filter(o => ['Confirmed', 'Label Generated', 'Parcel is Ready', 'Dispatched', 'Delivered', 'Settled'].includes(o.status)).length },
      { name: 'Shipped', value: orders.filter(o => ['Dispatched', 'Delivered', 'Settled'].includes(o.status)).length },
      { name: 'Delivered', value: orders.filter(o => ['Delivered', 'Settled'].includes(o.status)).length },
      { name: 'Returned', value: orders.filter(o => ['Cancelled', 'Rejected', 'Refunded'].includes(o.status)).length },
    ];
  }, [orders]);

  const divisionData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(order => {
      const retailer = retailers.find(r => r.id === order.retailerId);
      const district = retailer?.district || 'Unknown';
      counts[district] = (counts[district] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [orders, retailers]);

  const paymentMethodData = useMemo(() => {
    // Mocked for now as we don't have payment method in order
    return [
      { name: 'bKash', value: 40 },
      { name: 'COD', value: 35 },
      { name: 'Nagad', value: 15 },
      { name: 'Bank Transfer', value: 10 },
    ];
  }, []);

  const searchQueriesData = [
    { query: 'Cotton T-Shirt', count: 1245, conversion: '12%' },
    { query: 'Denim Jeans', count: 980, conversion: '8%' },
    { query: 'Winter Jacket', count: 850, conversion: '15%' },
    { query: 'Sneakers', count: 720, conversion: '5%' },
    { query: 'Formal Shirt', count: 650, conversion: '10%' },
  ];

  const buyerAcquisitionData = [
    { name: 'Direct', value: 40 },
    { name: 'Social Media', value: 30 },
    { name: 'Referral', value: 20 },
    { name: 'Organic Search', value: 10 },
  ];

  const sellerOnboardingData = useMemo(() => {
    return [
      { name: 'Registered', value: wholesalers.length },
      { name: 'Verified', value: wholesalers.filter(w => w.status === 'Active').length },
      { name: 'First Listing', value: wholesalers.filter(w => products.some(p => p.wholesalerId === w.id)).length },
      { name: 'First Sale', value: wholesalers.filter(w => orders.some(o => o.wholesalerName === w.companyName)).length },
    ];
  }, [wholesalers, products, orders]);

  const logisticsPerformanceData = useMemo(() => {
    const courierStats: Record<string, { total: number, delivered: number, rto: number, delayed: number }> = {};
    orders.forEach(o => {
      if (!o.shippingMedium) return;
      if (!courierStats[o.shippingMedium]) {
        courierStats[o.shippingMedium] = { total: 0, delivered: 0, rto: 0, delayed: 0 };
      }
      courierStats[o.shippingMedium].total += 1;
      if (['Delivered', 'Settled'].includes(o.status)) {
        courierStats[o.shippingMedium].delivered += 1;
      } else if (['Cancelled', 'Rejected', 'Refunded'].includes(o.status)) {
        courierStats[o.shippingMedium].rto += 1;
      }
    });
    
    const data = Object.entries(courierStats).map(([name, stats]) => {
      const onTime = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
      const rto = stats.total > 0 ? (stats.rto / stats.total) * 100 : 0;
      const delayed = Math.max(0, 100 - onTime - rto);
      return {
        name,
        onTime: parseFloat(onTime.toFixed(1)),
        rto: parseFloat(rto.toFixed(1)),
        delayed: parseFloat(delayed.toFixed(1))
      };
    });

    // Fallback if no data
    if (data.length === 0) {
      return [
        { name: 'SteadFast', onTime: 95, delayed: 4, rto: 1 },
        { name: 'Pathao', onTime: 92, delayed: 5, rto: 3 },
        { name: 'RedX', onTime: 88, delayed: 8, rto: 4 },
        { name: 'eCourier', onTime: 90, delayed: 7, rto: 3 },
      ];
    }
    return data;
  }, [orders]);

  const categoryPerformanceData = useMemo(() => {
    const catSales: Record<string, { sales: number, returns: number }> = {};
    orders.forEach(order => {
      const retailer = retailers.find(r => r.id === order.retailerId);
      const categories = retailer?.category && retailer.category.length > 0 ? retailer.category : ['General'];
      
      categories.forEach(cat => {
          if (!catSales[cat]) catSales[cat] = { sales: 0, returns: 0 };
          catSales[cat].sales += order.amount / categories.length;
          if (['Cancelled', 'Rejected', 'Refunded'].includes(order.status)) {
            catSales[cat].returns += order.amount / categories.length;
          }
      });
    });
    return Object.entries(catSales).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.sales - a.sales).slice(0, 5);
  }, [orders, retailers]);

  const tabs = [
    { id: 'executive', label: 'Executive', icon: Activity },
    { id: 'orders', label: 'Orders & Sales', icon: ShoppingCart },
    { id: 'buyers', label: 'Buyers', icon: Users },
    { id: 'sellers', label: 'Sellers', icon: ShoppingBag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'logistics', label: 'Logistics', icon: Truck },
    { id: 'search', label: 'Search & Discovery', icon: Search },
  ];

  const renderExecutiveDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Total GMV</p>
              <h3 className="text-3xl font-bold">৳ {(totalGMV / 1000000).toFixed(1)}M</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-100">
            <TrendingUp className="w-4 h-4" />
            <span>Calculated</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Active Buyers</p>
              <h3 className="text-3xl font-bold">{activeBuyers.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-100">
            <TrendingUp className="w-4 h-4" />
            <span>Calculated</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Active Sellers</p>
              <h3 className="text-3xl font-bold">{activeSellers.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-purple-100">
            <TrendingUp className="w-4 h-4" />
            <span>Calculated</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-100 text-sm font-medium mb-1">Orders Today</p>
              <h3 className="text-3xl font-bold">{ordersToday.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-100">
            <TrendingUp className="w-4 h-4" />
            <span>{orderGrowth > 0 ? '+' : ''}{orderGrowth.toFixed(1)}% vs yesterday</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Pulse */}
        <Card title="Revenue Pulse (Live)" className="lg:col-span-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorToday" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorYesterday" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `৳${value/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`৳ ${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Area type="monotone" dataKey="today" name="Today" stroke="#10b981" fillOpacity={1} fill="url(#colorToday)" />
                <Area type="monotone" dataKey="yesterday" name="Yesterday" stroke="#94a3b8" fillOpacity={1} fill="url(#colorYesterday)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Platform Health & Alerts */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
            <div className="text-center py-6">
              <h3 className="text-slate-400 text-sm font-medium mb-2">Platform Health Score</h3>
              <div className="flex items-center justify-center gap-4">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-700"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      strokeDasharray="87, 100"
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white">87</span>
                    <span className="text-xs text-slate-400">/100</span>
                  </div>
                </div>
              </div>
              <p className="text-emerald-400 text-sm mt-4 flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4" /> Healthy Status
              </p>
            </div>
          </Card>

          <Card title="Alerts & Anomalies">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">High Cart Abandonment</h4>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">Spike of 40% in the last 2 hours for Electronics category.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">COD Risk Alert</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">Unusually high COD orders from new accounts in Sylhet.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const aov = orders.length > 0 ? totalGMV / orders.length : 0;
  
  const retailerOrderCounts: Record<string, number> = {};
  orders.forEach(o => {
    retailerOrderCounts[o.retailerId] = (retailerOrderCounts[o.retailerId] || 0) + 1;
  });
  const repeatRetailers = Object.values(retailerOrderCounts).filter(count => count > 1).length;
  const totalRetailersWithOrders = Object.keys(retailerOrderCounts).length;
  const repeatOrderRate = totalRetailersWithOrders > 0 ? (repeatRetailers / totalRetailersWithOrders) * 100 : 0;

  const renderOrdersSales = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Order Funnel">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderFunnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30}>
                  {orderFunnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Division-wise Order Distribution">
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={divisionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {divisionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value}`, 'Orders']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Average Order Value (AOV)</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white">৳ {aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
              <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Calculated from total</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Repeat Order Rate</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{repeatOrderRate.toFixed(1)}%</h4>
              <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Calculated from users</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Peak Ordering Hour</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white">8:00 PM - 10:00 PM</h4>
              <p className="text-xs text-slate-500 mt-1">35% of daily orders</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const totalCommission = payments.reduce((sum, p) => sum + p.commission, 0);
  const totalGrossRevenue = totalGMV;
  const totalNetRevenue = totalGMV - totalCommission;

  const renderFinancial = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500">
          <p className="text-sm text-slate-500 font-medium">Gross Revenue</p>
          <h4 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">৳ {(totalGrossRevenue / 1000000).toFixed(1)}M</h4>
          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Calculated</p>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-500">
          <p className="text-sm text-slate-500 font-medium">Net Revenue</p>
          <h4 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">৳ {(totalNetRevenue / 1000000).toFixed(1)}M</h4>
          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Calculated</p>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-purple-500">
          <p className="text-sm text-slate-500 font-medium">Platform Commission</p>
          <h4 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">৳ {(totalCommission / 1000000).toFixed(1)}M</h4>
          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Calculated</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Payment Method Breakdown">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Share']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="COD Risk Tracking (Bangladesh)">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-red-900 dark:text-red-400">High Risk COD Orders</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">124 orders flagged today</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                Review
              </button>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Risk Factors</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400">New accounts (0 previous orders)</span>
                  <span className="font-medium text-slate-900 dark:text-white">45%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400">High value (&gt; ৳10,000)</span>
                  <span className="font-medium text-slate-900 dark:text-white">30%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400">History of RTO</span>
                  <span className="font-medium text-slate-900 dark:text-white">25%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderSearchDiscovery = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Search Queries">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Search Term</th>
                  <th className="px-4 py-3">Search Volume</th>
                  <th className="px-4 py-3 rounded-tr-lg">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {searchQueriesData.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.query}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.count.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                        {item.conversion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Zero Result Searches (Missed Opportunities)">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-slate-900 dark:text-white">"Gucci T-shirt Replica"</span>
              </div>
              <span className="text-sm font-bold text-slate-500">450 searches</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-slate-900 dark:text-white">"Winter Gloves Leather"</span>
              </div>
              <span className="text-sm font-bold text-slate-500">320 searches</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-slate-900 dark:text-white">"Smart Watch Strap 22mm"</span>
              </div>
              <span className="text-sm font-bold text-slate-500">280 searches</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const newBuyersThisMonth = retailers.filter(r => {
    if (!r.createdAt) return false;
    const d = new Date(r.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const returningBuyers = repeatRetailers;

  const inactiveBuyers = retailers.filter(r => {
    if (!r.lastOrderDate) return true;
    const d = new Date(r.lastOrderDate);
    const diffTime = Math.abs(today.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 30;
  }).length;

  const topBuyers = useMemo(() => {
    const buyerStats: Record<string, { name: string, spend: number, orders: number }> = {};
    orders.forEach(o => {
      if (!buyerStats[o.retailerId]) {
        buyerStats[o.retailerId] = { name: o.retailerName, spend: 0, orders: 0 };
      }
      buyerStats[o.retailerId].spend += o.amount;
      buyerStats[o.retailerId].orders += 1;
    });
    return Object.values(buyerStats).sort((a, b) => b.spend - a.spend).slice(0, 5);
  }, [orders]);

  const renderBuyers = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 font-medium">New Buyers (This Month)</p>
          <h4 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{newBuyersThisMonth.toLocaleString()}</h4>
          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Calculated</p>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 font-medium">Returning Buyers</p>
          <h4 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{returningBuyers.toLocaleString()}</h4>
          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Calculated</p>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 font-medium">Inactive Buyers (&gt;30 days)</p>
          <h4 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{inactiveBuyers.toLocaleString()}</h4>
          <button className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">Trigger Re-engagement Campaign</button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Buyer Acquisition Source">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={buyerAcquisitionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {buyerAcquisitionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Share']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top Buyers Leaderboard">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Buyer Name</th>
                  <th className="px-4 py-3">Total Spend</th>
                  <th className="px-4 py-3 rounded-tr-lg">Orders</th>
                </tr>
              </thead>
              <tbody>
                {topBuyers.map((buyer, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                        {buyer.name.charAt(0)}
                      </div>
                      {buyer.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">৳ {buyer.spend.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{buyer.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );

  const topSellers = useMemo(() => {
    const sellerStats: Record<string, { name: string, revenue: number, orders: number }> = {};
    orders.forEach(o => {
      if (!sellerStats[o.wholesalerName]) {
        sellerStats[o.wholesalerName] = { name: o.wholesalerName, revenue: 0, orders: 0 };
      }
      sellerStats[o.wholesalerName].revenue += o.amount;
      sellerStats[o.wholesalerName].orders += 1;
    });
    return Object.values(sellerStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  const deadStock = useMemo(() => {
    return products
      .filter(p => p.stock > 0)
      .map(p => {
        const d = new Date(p.updatedAt || p.createdAt);
        const diffTime = Math.abs(today.getTime() - d.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          name: p.name,
          days,
          value: p.stock * p.basePrice
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 4);
  }, [products, today]);

  const renderSellers = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Seller Onboarding Funnel">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sellerOnboardingData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={30}>
                  {sellerOnboardingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top Performing Sellers">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Seller</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Rating</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.map((seller, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{seller.name}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">৳ {seller.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-500">★</span>
                        <span className="text-slate-600 dark:text-slate-400">4.8</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Category Performance (Sales vs Returns)">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: 'transparent'}}
                />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returns" name="Returns" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Dead Stock / Slow Moving Products">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Product Name</th>
                  <th className="px-4 py-3">Days in Stock</th>
                  <th className="px-4 py-3">Inventory Value</th>
                  <th className="px-4 py-3 rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody>
                {deadStock.map((product, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{product.name}</td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400 font-medium">{product.days} days</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">৳ {product.value.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded font-medium hover:bg-blue-200 transition-colors">
                        Create Discount
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderLogistics = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Courier Performance Comparison">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={logisticsPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: 'transparent'}}
                />
                <Legend />
                <Bar dataKey="onTime" name="On Time (%)" stackId="a" fill="#10b981" />
                <Bar dataKey="delayed" name="Delayed (%)" stackId="a" fill="#f59e0b" />
                <Bar dataKey="rto" name="RTO (%)" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Average Delivery Time by Division">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Division</th>
                  <th className="px-4 py-3">Avg. Delivery Time</th>
                  <th className="px-4 py-3 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Dhaka (Inside)', time: '1.2 Days', status: 'Excellent', color: 'text-emerald-600 bg-emerald-100' },
                  { name: 'Dhaka (Suburbs)', time: '2.5 Days', status: 'Good', color: 'text-blue-600 bg-blue-100' },
                  { name: 'Chattogram', time: '3.1 Days', status: 'Good', color: 'text-blue-600 bg-blue-100' },
                  { name: 'Sylhet', time: '4.5 Days', status: 'Fair', color: 'text-amber-600 bg-amber-100' },
                  { name: 'Rajshahi', time: '4.8 Days', status: 'Fair', color: 'text-amber-600 bg-amber-100' },
                  { name: 'Barishal', time: '6.2 Days', status: 'Needs Improvement', color: 'text-red-600 bg-red-100' },
                ].map((div, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{div.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{div.time}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${div.color} dark:bg-opacity-20`}>
                        {div.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics & Reports</h1>
          <p className="text-slate-500">Comprehensive insights and performance metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-white text-black border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Year</option>
            <option>All Time</option>
          </select>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-1 min-w-max pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'executive' && renderExecutiveDashboard()}
        {activeTab === 'orders' && renderOrdersSales()}
        {activeTab === 'buyers' && renderBuyers()}
        {activeTab === 'sellers' && renderSellers()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'financial' && renderFinancial()}
        {activeTab === 'logistics' && renderLogistics()}
        {activeTab === 'search' && renderSearchDiscovery()}
      </div>
    </div>
  );
};
