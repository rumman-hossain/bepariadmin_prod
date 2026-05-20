import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, Search, Filter, Download, 
  Activity, AlertTriangle, CheckCircle, Info,
  Clock, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { Card } from './ui/Card';

// Mock data for audit logs
const MOCK_AUDIT_LOGS = [
  { id: 'AL-1001', timestamp: '2026-03-24T08:15:22Z', user: 'Admin User', role: 'Owner', action: 'Login', resource: 'System', status: 'Success', ipAddress: '192.168.1.45', details: 'Successful login from Dhaka.' },
  { id: 'AL-1002', timestamp: '2026-03-24T08:30:10Z', user: 'Admin User', role: 'Owner', action: 'Update Settings', resource: 'System Settings', status: 'Success', ipAddress: '192.168.1.45', details: 'Updated global referral bonus amount.' },
  { id: 'AL-1003', timestamp: '2026-03-24T09:05:44Z', user: 'Manager One', role: 'Manager', action: 'Approve Order', resource: 'Order ORD-4521', status: 'Success', ipAddress: '10.0.0.12', details: 'Approved order for Retailer RET-001.' },
  { id: 'AL-1004', timestamp: '2026-03-24T09:12:05Z', user: 'System', role: 'System', action: 'Auto-Sync', resource: 'Inventory', status: 'Warning', ipAddress: 'localhost', details: 'Inventory sync completed with 2 items out of stock.' },
  { id: 'AL-1005', timestamp: '2026-03-24T09:45:30Z', user: 'Unknown', role: 'Guest', action: 'Failed Login', resource: 'Admin Portal', status: 'Failed', ipAddress: '203.0.113.42', details: 'Failed login attempt for admin@beparibd.com. Incorrect password.' },
  { id: 'AL-1006', timestamp: '2026-03-24T10:20:15Z', user: 'Manager Two', role: 'Manager', action: 'Delete Product', resource: 'Product PRD-998', status: 'Success', ipAddress: '10.0.0.15', details: 'Deleted discontinued product "Summer T-Shirt V1".' },
  { id: 'AL-1007', timestamp: '2026-03-24T11:05:00Z', user: 'Admin User', role: 'Owner', action: 'Suspend Account', resource: 'Wholesaler WHL-003', status: 'Success', ipAddress: '192.168.1.45', details: 'Suspended account due to policy violation.' },
  { id: 'AL-1008', timestamp: '2026-03-24T11:30:22Z', user: 'System', role: 'System', action: 'Database Backup', resource: 'Database', status: 'Success', ipAddress: 'localhost', details: 'Automated daily database backup completed successfully.' },
  { id: 'AL-1009', timestamp: '2026-03-24T12:15:40Z', user: 'Manager One', role: 'Manager', action: 'Export Data', resource: 'Retailer List', status: 'Success', ipAddress: '10.0.0.12', details: 'Exported retailer list to CSV.' },
  { id: 'AL-1010', timestamp: '2026-03-24T13:00:05Z', user: 'Admin User', role: 'Owner', action: 'Change Role', resource: 'User Manager Two', status: 'Success', ipAddress: '192.168.1.45', details: 'Changed role from Manager to Senior Manager.' },
  { id: 'AL-1011', timestamp: '2026-03-24T14:22:18Z', user: 'System', role: 'System', action: 'API Error', resource: 'Payment Gateway', status: 'Failed', ipAddress: 'localhost', details: 'Connection timeout to payment gateway.' },
  { id: 'AL-1012', timestamp: '2026-03-24T15:10:33Z', user: 'Admin User', role: 'Owner', action: 'Add Account', resource: 'Retailer RET-005', status: 'Success', ipAddress: '192.168.1.45', details: 'Manually added new retailer account.' },
];

export const AdminAuditLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter(log => {
      const matchesSearch = 
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
      const matchesAction = actionFilter === 'All' || log.action.includes(actionFilter);

      return matchesSearch && matchesStatus && matchesAction;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [searchTerm, statusFilter, actionFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'Warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'Failed': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Success': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Warning': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Failed': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const uniqueActions = Array.from(new Set(MOCK_AUDIT_LOGS.map(log => log.action.split(' ')[0])));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            System Audit Logs
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive record of all system activities, security events, and user actions.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by user, action, resource, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="All">All Statuses</option>
                <option value="Success">Success</option>
                <option value="Warning">Warning</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            <div className="relative">
              <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="All">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User & Role</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resource</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${expandedLog === log.id ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                          {log.user.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{log.user}</div>
                          <div className="text-xs text-slate-500">{log.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{log.action}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{log.id}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {log.resource}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(log.status)}`}>
                        {getStatusIcon(log.status)}
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        {expandedLog === log.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-700">
                      <td colSpan={6} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Details</h4>
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                              <span className="font-medium text-slate-900 dark:text-white block mb-1">Description:</span>
                              {log.details}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Network Info</h4>
                            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">IP Address:</span>
                                <span className="font-mono">{log.ipAddress}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">User Agent:</span>
                                <span className="truncate max-w-[150px]" title="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36">Mozilla/5.0...</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Metadata</h4>
                            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Event ID:</span>
                                <span className="font-mono">{log.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Session ID:</span>
                                <span className="font-mono text-xs">sess_{log.id.toLowerCase().replace('-', '')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
