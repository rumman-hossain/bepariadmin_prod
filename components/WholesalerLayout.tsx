import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingBag, ShoppingCart, 
  CreditCard, Truck, Settings, LogOut, TrendingUp, Store, MessageSquare, Menu, ArrowLeft
} from 'lucide-react';
import { AppNotification } from '../src/types/domain';
import { NotificationsPopover } from './NotificationsPopover';

interface WholesalerLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'fulfillment', label: 'Fulfillment', icon: Truck },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
];

const secondaryNavItems = [
  { id: 'marketplace', label: 'Marketplace', icon: Store },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const WholesalerLayout: React.FC<WholesalerLayoutProps> = ({ 
  children, activeTab, setActiveTab, onLogout,
  notifications, onMarkNotificationRead, onMarkAllNotificationsRead
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-[#F5F5F7] dark:bg-[#000000] min-h-screen w-full flex flex-col md:flex-row font-sans selection:bg-blue-500/30">
      
      {/* Mobile Header (Glassmorphism) */}
      <header className={`md:hidden fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm' : 'bg-transparent'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <Menu className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <span className="font-bold text-sm text-white">W</span>
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Supplier</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
             <NotificationsPopover 
                notifications={notifications}
                onMarkRead={onMarkNotificationRead}
                onMarkAllRead={onMarkAllNotificationsRead}
             />
          </div>
        </div>
      </header>

      {/* Mobile Side Drawer */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}>
          <div className="w-[280px] h-full bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl p-6 shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col border-r border-gray-200/50 dark:border-gray-800/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/20 dark:border-white/10">
                  <span className="font-bold text-xl text-white">W</span>
                </div>
                <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">PARTNER</span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 -mr-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar">
              <div className="space-y-1.5">
                <p className="px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Main Navigation</p>
                {navItems.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button 
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }} 
                      className={`flex items-center gap-3.5 w-full p-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                        isActive 
                        ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/20 dark:border-blue-400/20' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white border border-transparent'
                      }`}
                    >
                      {isActive && <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent dark:from-blue-400/5 opacity-50"></div>}
                      <item.icon className={`w-5 h-5 shrink-0 relative z-10 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium whitespace-nowrap relative z-10 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="space-y-1.5">
                <p className="px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Secondary</p>
                {secondaryNavItems.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button 
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }} 
                      className={`flex items-center gap-3.5 w-full p-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                        isActive 
                        ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/20 dark:border-blue-400/20' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white border border-transparent'
                      }`}
                    >
                      {isActive && <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent dark:from-blue-400/5 opacity-50"></div>}
                      <item.icon className={`w-5 h-5 shrink-0 relative z-10 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium whitespace-nowrap relative z-10 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-200/50 dark:border-gray-800/50">
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 mb-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-sm font-bold text-white border border-white/20 dark:border-white/10 shadow-inner">
                      MT
                  </div>
                  <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate tracking-tight">Mega Textiles</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</p>
                      </div>
                  </div>
              </div>
              <button 
                onClick={onLogout} 
                className="flex items-center justify-center gap-2.5 text-red-600 dark:text-red-400 font-medium p-3.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl w-full transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Apple Style Glassmorphism) */}
      <aside className="hidden md:flex flex-col w-[280px] h-screen sticky top-0 bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-3xl border-r border-gray-200/50 dark:border-gray-800/50 z-40 shadow-sm transition-all duration-300">
        <div className="h-20 flex items-center px-8 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/30 dark:bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/20 dark:border-white/10">
              <span className="font-bold text-xl text-white">W</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">PARTNER</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 custom-scrollbar">
          <div className="space-y-1.5">
            <p className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Main Navigation</p>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                    isActive 
                      ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/20 dark:border-blue-400/20' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  {isActive && <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent dark:from-blue-400/5 opacity-50"></div>}
                  <item.icon className={`w-5 h-5 shrink-0 relative z-10 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                  <span className={`text-sm font-medium whitespace-nowrap relative z-10 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-1.5">
            <p className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Secondary</p>
            {secondaryNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                    isActive 
                      ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/20 dark:border-blue-400/20' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  {isActive && <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent dark:from-blue-400/5 opacity-50"></div>}
                  <item.icon className={`w-5 h-5 shrink-0 relative z-10 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                  <span className={`text-sm font-medium whitespace-nowrap relative z-10 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/30 dark:bg-black/10">
          <div className="mb-4 px-2">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest mb-3">Account</p>
              <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-gray-100/50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-500/20 transition-all duration-300 text-xs font-medium text-gray-600 dark:text-gray-400 group"
              >
                  <LogOut className="w-4 h-4 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                  <span>Sign Out</span>
              </button>
          </div>
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300 cursor-pointer shadow-sm">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-sm font-bold text-white border border-white/20 dark:border-white/10 shadow-inner">
                  MT
              </div>
              <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate tracking-tight">Mega Textiles</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</p>
                  </div>
              </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto pt-16 md:pt-0 pb-24 md:pb-0 custom-scrollbar relative" style={{ scrollbarGutter: 'stable' }}>
        {/* Desktop Header */}
        <header className="hidden md:flex sticky top-0 z-30 bg-white/70 dark:bg-[#121212]/70 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-800/50 px-8 py-4 items-center justify-end shadow-sm">
          <div className="flex items-center gap-4">
             <NotificationsPopover 
                notifications={notifications}
                onMarkRead={onMarkNotificationRead}
                onMarkAllRead={onMarkAllNotificationsRead}
             />
          </div>
        </header>
        
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (Apple Style) */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
        <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-3xl border border-gray-200/50 dark:border-gray-800/50 rounded-[2rem] px-6 py-3 flex justify-between items-center shadow-2xl shadow-black/10">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 p-1 transition-colors ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <LayoutDashboard className={`w-6 h-6 ${activeTab === 'dashboard' ? 'fill-current/20' : ''}`} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button onClick={() => setActiveTab('products')} className={`flex flex-col items-center gap-1 p-1 transition-colors ${activeTab === 'products' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <ShoppingBag className={`w-6 h-6 ${activeTab === 'products' ? 'fill-current/20' : ''}`} />
            <span className="text-[10px] font-medium">Products</span>
          </button>
          <div className="relative -top-6">
            <button onClick={() => setActiveTab('orders')} className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/40 hover:scale-105 transition-transform border border-white/20">
              <ShoppingCart className="w-6 h-6" />
            </button>
          </div>
          <button onClick={() => setActiveTab('fulfillment')} className={`flex flex-col items-center gap-1 p-1 transition-colors ${activeTab === 'fulfillment' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <Truck className={`w-6 h-6 ${activeTab === 'fulfillment' ? 'fill-current/20' : ''}`} />
            <span className="text-[10px] font-medium">Fulfill</span>
          </button>
          <button onClick={() => setActiveTab('payments')} className={`flex flex-col items-center gap-1 p-1 transition-colors ${activeTab === 'payments' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <CreditCard className={`w-6 h-6 ${activeTab === 'payments' ? 'fill-current/20' : ''}`} />
            <span className="text-[10px] font-medium">Wallet</span>
          </button>
        </div>
      </div>

    </div>
  );
};
