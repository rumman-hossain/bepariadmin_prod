import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { 
  ShieldAlert, AlertTriangle, Search, 
  ArrowUpRight, ArrowDownRight, Eye, UserX, UserCheck,
  Activity, Zap, Lock, ExternalLink,
  Users, MapPin, Clock
} from 'lucide-react';
import { Wholesaler, Retailer } from '../types';

interface FraudMonitorProps {
  wholesalers: Wholesaler[];
  retailers: Retailer[];
  onUpdateWholesalerStatus: (id: string, status: 'Active' | 'Suspended') => void;
  onUpdateRetailerStatus: (id: string, status: 'Active' | 'Suspended') => void;
}

interface FraudFlag {
  id: string;
  type: 'Payment' | 'Account' | 'Order' | 'Identity';
  severity: 'High' | 'Medium' | 'Low';
  entityName: string;
  entityType: 'Supplier' | 'Retailer';
  description: string;
  timestamp: string;
}

export const AdminFraudMonitor: React.FC<FraudMonitorProps> = ({ 
  wholesalers, 
  retailers,
  onUpdateWholesalerStatus,
  onUpdateRetailerStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Supplier' | 'Retailer'>('All');
  const [selectedEntity, setSelectedEntity] = useState<Wholesaler | Retailer | null>(null);

  // Mock Fraud Flags
  const fraudFlags: FraudFlag[] = [
    { id: 'FLG-001', type: 'Payment', severity: 'High', entityName: 'Sokher Bazar', entityType: 'Retailer', description: 'Multiple failed bKash transactions within 5 minutes', timestamp: '2024-03-14 10:25' },
    { id: 'FLG-002', type: 'Order', severity: 'Medium', entityName: 'Prime Foods Corp', entityType: 'Supplier', description: 'Unusual spike in order cancellations (45% increase)', timestamp: '2024-03-14 09:12' },
    { id: 'FLG-003', type: 'Account', severity: 'Low', entityName: 'Bhai Bhai Traders', entityType: 'Retailer', description: 'Login attempt from unrecognized location (Sylhet)', timestamp: '2024-03-14 08:45' },
    { id: 'FLG-004', type: 'Identity', severity: 'High', entityName: 'Mega Textiles Ltd', entityType: 'Supplier', description: 'Trade license document verification failed', timestamp: '2024-03-13 16:30' },
  ];

  const combinedEntities = useMemo(() => {
    const s = wholesalers.map(w => ({
      id: w.id,
      name: w.companyName,
      type: 'Supplier' as const,
      status: w.status,
      riskScore: w.riskScore || 0,
      location: w.location,
      mobile: w.mobile,
      lastActive: '2 hours ago'
    }));
    const r = retailers.map(ret => ({
      id: ret.id,
      name: ret.shopName,
      type: 'Retailer' as const,
      status: ret.status,
      riskScore: ret.riskScore,
      location: ret.district,
      mobile: ret.mobile,
      lastActive: '15 mins ago'
    }));
    return [...s, ...r].sort((a, b) => b.riskScore - a.riskScore);
  }, [wholesalers, retailers]);

  const filteredEntities = combinedEntities.filter(e => {
    const searchLower = (searchQuery || '').toLowerCase();
    const matchesSearch = (e.name || '').toLowerCase().includes(searchLower) || (e.id || '').toLowerCase().includes(searchLower);
    const matchesFilter = filterType === 'All' || e.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-100';
    if (score >= 30) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-amber-500';
      case 'Low': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-red-600" />
            Fraud Monitor
          </h1>
          <p className="text-slate-500 dark:text-slate-400">AI-powered threat detection and risk management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1">
            <Zap className="w-3 h-3" /> System Live
          </div>
          <div className="text-xs text-slate-400 font-mono">Last Scan: Just now</div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-red-500">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 12%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-black">24</h3>
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Critical Flags</p>
        </Card>

        <Card className="p-4 border-l-4 border-amber-500">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> 5%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-black">156</h3>
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Suspicious Events</p>
        </Card>

        <Card className="p-4 border-l-4 border-emerald-500">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-black">1,240</h3>
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Monitored Entities</p>
        </Card>

        <Card className="p-4 border-l-4 border-slate-900">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Lock className="w-5 h-5 text-slate-900" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-black">8</h3>
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Blocked Accounts</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Monitoring Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-black">Risk Analysis</h2>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider">Real-time</span>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search entities..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'All' | 'Supplier' | 'Retailer')}
                  className="px-3 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none"
                >
                  <option value="All">All Types</option>
                  <option value="Supplier">Suppliers</option>
                  <option value="Retailer">Retailers</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Entity</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Risk Score</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Last Active</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEntities.map((entity) => (
                    <tr key={entity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            entity.type === 'Supplier' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {entity.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-black text-sm">{entity.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{entity.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          entity.type === 'Supplier' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'
                        }`}>
                          {entity.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold ${getRiskColor(entity.riskScore)}`}>
                          {entity.riskScore}
                          <span className="text-[10px] opacity-70">/ 100</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium ${
                          entity.status === 'Active' ? 'text-emerald-600' : 
                          entity.status === 'Suspended' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {entity.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {entity.lastActive}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedEntity(entity)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {entity.status === 'Active' ? (
                            <button 
                              onClick={() => entity.type === 'Supplier' ? onUpdateWholesalerStatus(entity.id, 'Suspended') : onUpdateRetailerStatus(entity.id, 'Suspended')}
                              className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                              title="Suspend Account"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => entity.type === 'Supplier' ? onUpdateWholesalerStatus(entity.id, 'Active') : onUpdateRetailerStatus(entity.id, 'Active')}
                              className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Activate Account"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar: Recent Flags & Rules */}
        <div className="space-y-6">
          {/* Recent Flags Feed */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-black flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Live Threat Feed
              </h3>
              <button className="text-[10px] font-bold text-emerald-600 uppercase hover:underline">Clear All</button>
            </div>
            <div className="space-y-4">
              {fraudFlags.map((flag) => (
                <div key={flag.id} className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 pb-4 last:pb-0">
                  <div className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full ${getSeverityColor(flag.severity)}`} />
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{flag.timestamp}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white uppercase ${getSeverityColor(flag.severity)}`}>
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-black leading-tight">
                    {flag.entityName} <span className="text-slate-400 font-normal">({flag.entityType})</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{flag.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="text-[10px] font-bold text-emerald-600 hover:underline">Investigate</button>
                    <button className="text-[10px] font-bold text-slate-400 hover:text-red-600">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Active Rules */}
          <Card className="p-4 bg-slate-900 text-white">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold-400" />
              Active Guard Rules
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Velocity Check', desc: 'Max 5 orders/hr per retailer', active: true },
                { label: 'Geo-Fencing', desc: 'Flag logins outside Bangladesh', active: true },
                { label: 'Payment Pattern', desc: 'Detect multiple bKash failures', active: true },
                { label: 'Supplier Integrity', desc: 'Monitor cancellation rates > 20%', active: false },
              ].map((rule, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <p className="text-xs font-bold">{rule.label}</p>
                    <p className="text-[10px] text-slate-400">{rule.desc}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${rule.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">
              Manage Guard Rules
            </button>
          </Card>
        </div>
      </div>

      {/* Entity Detail Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-2xl bg-white overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                  selectedEntity.type === 'Supplier' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedEntity.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">{selectedEntity.name}</h3>
                  <p className="text-sm text-slate-500">{selectedEntity.type} • {selectedEntity.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEntity(null)} className="text-slate-400 hover:text-slate-600">
                <Lock className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Risk Profile</h4>
                <div className="p-4 rounded-2xl bg-white/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium text-slate-600">Overall Score</span>
                    <span className={`text-3xl font-bold ${getRiskColor(selectedEntity.riskScore).split(' ')[0]}`}>
                      {selectedEntity.riskScore}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        selectedEntity.riskScore >= 70 ? 'bg-red-500' : 
                        selectedEntity.riskScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedEntity.riskScore}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {selectedEntity.riskScore >= 70 ? 'High risk detected. Immediate action recommended.' : 
                     selectedEntity.riskScore >= 30 ? 'Moderate risk. Monitor activities closely.' : 
                     'Low risk entity. Standard monitoring active.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-white/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Location</p>
                    <p className="text-sm font-bold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" /> {selectedEntity.location}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Last Active</p>
                    <p className="text-sm font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" /> {selectedEntity.lastActive}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Logs</h4>
                <div className="space-y-2">
                  {[
                    { event: 'Login Success', date: 'Mar 14, 10:12', status: 'Safe' },
                    { event: 'Payment Attempt', date: 'Mar 14, 09:45', status: 'Safe' },
                    { event: 'Profile Update', date: 'Mar 13, 14:20', status: 'Safe' },
                  ].map((log, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <p className="font-bold text-black">{log.event}</p>
                        <p className="text-[10px] text-slate-400">{log.date}</p>
                      </div>
                      <span className="text-emerald-600 font-bold">{log.status}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full py-2 text-xs font-bold text-emerald-600 border border-emerald-600/20 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                  View Full Audit Log <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-white/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setSelectedEntity(null)} className="px-4 py-2 text-sm font-bold text-slate-600">Close</button>
              {selectedEntity.status === 'Active' ? (
                <button 
                  onClick={() => {
                    if (selectedEntity.type === 'Supplier') {
                      onUpdateWholesalerStatus(selectedEntity.id, 'Suspended');
                    } else {
                      onUpdateRetailerStatus(selectedEntity.id, 'Suspended');
                    }
                    setSelectedEntity(null);
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-600/20"
                >
                  Suspend Account
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (selectedEntity.type === 'Supplier') {
                      onUpdateWholesalerStatus(selectedEntity.id, 'Active');
                    } else {
                      onUpdateRetailerStatus(selectedEntity.id, 'Active');
                    }
                    setSelectedEntity(null);
                  }}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                >
                  Reactivate Account
                </button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
