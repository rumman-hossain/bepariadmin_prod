import React from 'react';
import { 
  LayoutDashboard, Users, ShoppingBag, ShoppingCart, 
  CreditCard, Truck, FileText, AlertOctagon, Settings, 
  ShieldCheck, Briefcase, DollarSign, Factory, Gift, Tag, Share2, MessageSquare, BarChart2, Brain
} from 'lucide-react';
import { NavItem } from '../src/types/domain';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  onSwitchToWholesaler?: () => void;
  onSwitchToRetailer?: () => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'retailers', label: 'Retailers', icon: Users },
  { id: 'wholesalers', label: 'Wholesalers', icon: ShoppingBag },
  { id: 'products', label: 'Products', icon: ShoppingCart },
  { id: 'orders', label: 'Orders', icon: FileText },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'rewards', label: 'Reward Settings', icon: Gift },
  { id: 'coupons', label: 'Coupon Settings', icon: Tag },
  { id: 'referrals', label: 'Referral Settings', icon: Share2 },
  { id: 'manufacturing', label: 'Manufacturing', icon: Factory },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'accounting', label: 'Accounting', icon: DollarSign },
  { id: 'logistics', label: 'Logistics', icon: Truck },
  { id: 'hr', label: 'HR Management', icon: Briefcase },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'fraud', label: 'Fraud Monitor', icon: AlertOctagon },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
  { id: 'sales-brain', label: 'Sales Brain', icon: Brain },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen }) => {
  return (
    <div className={`fixed inset-y-0 left-0 z-50 bg-charcoal-900 text-white transition-all duration-300 ease-in-out shadow-xl flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <span className="font-bold text-lg">B</span>
          </div>
          {isOpen && <span className="font-bold text-lg tracking-wide animate-fade-in">BEPARIBD</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto px-3 space-y-1">
        {navItems.map((item) => {
            const Icon = item.icon as React.FC<{ className?: string }>;
            const isActive = activeTab === item.id;
            return (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                        isActive 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                    {isOpen && <span className="text-sm font-medium whitespace-nowrap animate-fade-in">{item.label}</span>}
                </button>
            )
        })}
      </nav>

    </div>
  );
};