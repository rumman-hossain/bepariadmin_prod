import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, Package, DollarSign, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { Card } from './ui/Card';
import { getDashboardInsights } from '../services/geminiService';
import { Retailer, Wholesaler, Order } from '../src/types/domain';

const COLORS = ['#0F9D58', '#FFBB28', '#FF8042', '#0088FE'];

interface DashboardProps {
  retailers: Retailer[];
  wholesalers: Wholesaler[];
  orders: Order[];
}

export const Dashboard: React.FC<DashboardProps> = ({ retailers, wholesalers, orders }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const kpis = useMemo(() => {
    const totalGMV = orders.reduce((sum, order) => sum + order.amount, 0);
    const activeRetailers = retailers.filter(r => r.status === 'Active').length;
    const activeWholesalers = wholesalers.filter(w => w.status === 'Active').length;
    const totalOrders = orders.length;

    return [
      { label: 'Total GMV', value: totalGMV.toLocaleString(), trend: 12.5, isCurrency: true },
      { label: 'Total Orders', value: totalOrders.toString(), trend: 8.2 },
      { label: 'Active Retailers', value: activeRetailers.toString(), trend: 5.1 },
      { label: 'Active Wholesalers', value: activeWholesalers.toString(), trend: 2.4 },
    ];
  }, [orders, retailers, wholesalers]);

  const chartDataSales = useMemo(() => {
    // Group orders by month (simplified for demo, assuming orders have 'date' like '2023-10-15')
    const monthlyData: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthlyData[months[d.getMonth()]] = 0;
    }

    orders.forEach(order => {
      const orderDate = new Date(order.date);
      const monthName = months[orderDate.getMonth()];
      if (monthlyData[monthName] !== undefined) {
        monthlyData[monthName] += order.amount;
      }
    });

    return Object.entries(monthlyData).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const chartDataStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const recentOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [orders]);

  const fraudAlerts = useMemo(() => {
    const alerts = [];
    const highRiskRetailers = retailers.filter(r => r.riskScore > 50);
    const highRiskWholesalers = wholesalers.filter(w => (w.riskScore || 0) > 30);

    if (highRiskRetailers.length > 0) {
      alerts.push({
        type: 'red',
        title: 'High Risk Retailer Detected',
        message: `Retailer ${highRiskRetailers[0].id} (${highRiskRetailers[0].shopName}) has a critically high risk score of ${highRiskRetailers[0].riskScore}. Account flagged.`
      });
    }

    if (highRiskWholesalers.length > 0) {
      alerts.push({
        type: 'yellow',
        title: 'Wholesaler Under Review',
        message: `Wholesaler ${highRiskWholesalers[0].id} (${highRiskWholesalers[0].companyName}) is showing unusual activity with a risk score of ${highRiskWholesalers[0].riskScore}.`
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        type: 'green',
        title: 'All Systems Normal',
        message: 'No suspicious activity detected in the last 24 hours.'
      });
    }

    return alerts;
  }, [retailers, wholesalers]);

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    const context = JSON.stringify({ kpis, recentOrders: recentOrders.slice(0, 3) });
    const result = await getDashboardInsights(context);
    setInsight(result);
    setLoadingInsight(false);
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black">Control Tower</h1>
          <p className="text-slate-500 dark:text-slate-400">Real-time platform overview</p>
        </div>
        <button
          onClick={handleGenerateInsight}
          disabled={loadingInsight}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
        >
          {loadingInsight ? <RefreshCw className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {loadingInsight ? 'Analyzing...' : 'Ask AI Analyst'}
        </button>
      </div>

      {/* AI Insight Section */}
      {insight && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">AI Strategic Analysis</h3>
              <div className="text-emerald-800 dark:text-emerald-200 text-sm whitespace-pre-line leading-relaxed">
                {insight}
              </div>
            </div>
            <button onClick={() => setInsight(null)} className="text-emerald-400 hover:text-emerald-600">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                {idx === 0 && <DollarSign className="w-6 h-6 text-emerald-600" />}
                {idx === 1 && <TrendingUp className="w-6 h-6 text-emerald-600" />}
                {idx === 2 && <Users className="w-6 h-6 text-emerald-600" />}
                {idx === 3 && <Package className="w-6 h-6 text-emerald-600" />}
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${kpi.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {kpi.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(kpi.trend)}%
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-black mt-1">
                {kpi.isCurrency ? '৳' : ''}{kpi.value}
              </h3>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="GMV Trend (Last 6 Months)" className="lg:col-span-2 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartDataSales}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F9D58" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0F9D58" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="value" stroke="#0F9D58" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Order Status Distribution" className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartDataStatus}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartDataStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 flex-wrap mt-4">
            {chartDataStatus.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Orders & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Recent Live Orders" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-white">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Order ID</th>
                  <th className="px-4 py-3">Retailer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-lg">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-black">{order.id}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{order.retailerName}</td>
                    <td className="px-4 py-3 font-semibold text-black">৳{order.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 
                          order.status === 'Pending Supplier Response' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-blue-100 text-blue-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        
        <Card title="Fraud Monitor">
            <div className="space-y-4">
                {fraudAlerts.map((alert, idx) => (
                  <div key={idx} className={`p-3 rounded-lg flex items-start gap-3 border ${
                    alert.type === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' :
                    alert.type === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800' :
                    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                  }`}>
                      <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                        alert.type === 'red' ? 'text-red-600' :
                        alert.type === 'yellow' ? 'text-yellow-600' :
                        'text-emerald-600'
                      }`} />
                      <div>
                          <h4 className={`text-sm font-semibold ${
                            alert.type === 'red' ? 'text-red-800 dark:text-red-200' :
                            alert.type === 'yellow' ? 'text-yellow-800 dark:text-yellow-200' :
                            'text-emerald-800 dark:text-emerald-200'
                          }`}>{alert.title}</h4>
                          <p className={`text-xs mt-1 ${
                            alert.type === 'red' ? 'text-red-600 dark:text-red-300' :
                            alert.type === 'yellow' ? 'text-yellow-600 dark:text-yellow-300' :
                            'text-emerald-600 dark:text-emerald-300'
                          }`}>{alert.message}</p>
                      </div>
                  </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <button className="text-sm text-emerald-600 font-medium hover:underline">View All Alerts</button>
            </div>
        </Card>
      </div>
    </div>
  );
};