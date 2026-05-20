import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Retailers } from './components/Retailers';
import { Wholesalers } from './components/Wholesalers';
import { Products } from './components/Products';
import { AdminPayments } from './components/AdminPayments';
import { AdminAuditLogs } from './components/AdminAuditLogs';
import { AdminSalesBrain } from './components/AdminSalesBrain';
import { AdminManufacturing } from './components/AdminManufacturing';
import { AdminRewards } from './components/AdminRewards';
import { AdminCoupons } from './components/AdminCoupons';
import { AdminReferrals } from './components/AdminReferrals';
import { AdminHR } from './components/AdminHR';
import { AdminAnalytics } from './components/AdminAnalytics';
import { AdminFraudMonitor } from './components/AdminFraudMonitor';
import { AdminSettings } from './components/AdminSettings';
import { Messages } from './components/Messages';

import { ShieldCheck, AlertOctagon } from 'lucide-react';
import { Product, Wholesaler, Retailer, Order, PaymentRecord, ManufacturingOrder, ManufacturingSample, RewardSettings, RewardItem, RetailerRewardsProfile, Coupon, ReferralSettings, ReferralRecord, ReferralPayment, Message, AppNotification } from './types';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorInfo: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, errorInfo: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo);
        if (parsed.error && parsed.error.includes('insufficient permissions')) {
          displayMessage = "You don't have permission to perform this action. Please make sure you are logged in as an admin.";
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertOctagon className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Application Error</h1>
          <p className="text-slate-600 mb-6 max-w-md">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Reload Application
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-slate-900 text-slate-300 text-xs rounded-lg overflow-auto max-w-full text-left">
              {this.state.errorInfo}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

import { MOCK_PRODUCTS, MOCK_WHOLESALERS, MOCK_RETAILERS, MOCK_ORDERS, WHOLESALER_ORDERS, WHOLESALER_PAYMENTS, MOCK_MANUFACTURING_ORDERS, MOCK_MANUFACTURING_SAMPLES, MOCK_REWARD_SETTINGS, MOCK_REWARDS, MOCK_RETAILER_REWARDS_PROFILE } from './services/mockData';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const handleSendMessage = (msg: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
      const now = new Date();
      const newMessage: Message = {
          ...msg,
          id: `MSG-${now.getTime()}`,
          timestamp: now.toISOString(),
          read: false
      };
      setMessages(prev => [...prev, newMessage]);
      
      handleAddNotification({
          userId: msg.receiverId,
          title: 'New Message',
          message: `You have a new message from ${msg.senderName}`,
          type: 'info'
      });
  };

  const handleAddNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const now = new Date();
      const newNotif: AppNotification = {
          ...notif,
          id: `NOTIF-${now.getTime()}`,
          timestamp: now.toISOString(),
          read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
  };

  const handleMarkNotificationRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllNotificationsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    
    if (loginEmail === 'admin@beparibd.com' && loginPassword === 'admin123') {
        setIsAuthenticated(true);
        return;
    }
    setLoginError('Invalid credentials. Please try again.');
  };

  // Central State
  const [allProducts, setAllProducts] = useState<Product[]>([...MOCK_PRODUCTS]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([...MOCK_WHOLESALERS]);
  const [retailers, setRetailers] = useState<Retailer[]>([...MOCK_RETAILERS]);
  const [orders, setOrders] = useState<Order[]>([...MOCK_ORDERS, ...WHOLESALER_ORDERS]);
  const [payments, setPayments] = useState([...WHOLESALER_PAYMENTS]);
  const [manufacturingOrders, setManufacturingOrders] = useState<ManufacturingOrder[]>([...MOCK_MANUFACTURING_ORDERS]);
  const [manufacturingSamples, setManufacturingSamples] = useState<ManufacturingSample[]>([...MOCK_MANUFACTURING_SAMPLES]);
  const [custom3DModel, setCustom3DModel] = useState<string | null>(null);
  const [fabricGSMOptions, setFabricGSMOptions] = useState([
      { id: 1, gsm: '160 GSM', price: 0 },
      { id: 2, gsm: '180 GSM', price: 20 },
      { id: 3, gsm: '200 GSM', price: 40 },
      { id: 4, gsm: '220 GSM', price: 60 },
  ]);

  // Rewards System State
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>(MOCK_REWARD_SETTINGS);
  const [rewards, setRewards] = useState<RewardItem[]>([...MOCK_REWARDS]);
  const [retailerRewardsProfiles, setRetailerRewardsProfiles] = useState<RetailerRewardsProfile[]>([MOCK_RETAILER_REWARDS_PROFILE]);
  const [coupons, setCoupons] = useState<Coupon[]>([
    {
        id: 'CPN-001',
        code: 'WELCOME500',
        type: 'fixed',
        value: 500,
        minPurchase: 5000,
        usageLimit: 1000,
        usedCount: 45,
        expiryDate: '2025-12-31',
        status: 'active',
        createdAt: '2023-10-01'
    },
    {
        id: 'CPN-002',
        code: 'DISCOUNT10',
        type: 'percentage',
        value: 10,
        minPurchase: 2000,
        maxDiscount: 1000,
        usageLimit: 500,
        usedCount: 120,
        expiryDate: '2024-06-30',
        status: 'active',
        createdAt: '2023-10-15'
    }
  ]);

  const [referralSettings, setReferralSettings] = useState<ReferralSettings>({
      commissionRate: 2.5,
      isActive: true,
      minOrderValue: 1000,
      bonusAmount: 200
  });

  const [referrals, setReferrals] = useState<ReferralRecord[]>([
      {
          id: 'REF-001',
          referrerId: 'RET-001',
          referrerName: 'Mayer Doa Store',
          refereeId: 'RET-005',
          refereeName: 'Dhaka Store',
          status: 'Active',
          totalEarnings: 1500,
          cashReward: 1000,
          couponReward: 500,
          joinedDate: '2023-11-01',
          lastOrderDate: '2023-11-15'
      },
      {
          id: 'REF-002',
          referrerId: 'RET-001',
          referrerName: 'Mayer Doa Store',
          refereeId: 'RET-008',
          refereeName: 'Chittagong Mart',
          status: 'Pending',
          totalEarnings: 0,
          cashReward: 0,
          couponReward: 0,
          joinedDate: '2023-11-20'
      }
  ]);

  const [referralPayments, setReferralPayments] = useState<ReferralPayment[]>([]);

  const handleAddReferralPayment = (payment: ReferralPayment) => {
      setReferralPayments(prev => [payment, ...prev]);
      setReferrals(prev => prev.map(r => {
          if (r.id === payment.referralId) {
              return {
                  ...r,
                  cashReward: Math.max(0, r.cashReward - payment.amount)
              };
          }
          return r;
      }));
  };

  const handleSendCoupon = (referralId: string, couponCode: string) => {
      const referral = referrals.find(r => r.id === referralId);
      if (referral && referral.couponReward > 0) {
          const newCoupon: Coupon = {
              id: `CPN-${Date.now()}`,
              code: couponCode,
              type: 'fixed',
              value: referral.couponReward,
              minPurchase: 0,
              usageLimit: 1,
              usedCount: 0,
              expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
              status: 'active',
              createdAt: new Date().toISOString().split('T')[0]
          };
          setCoupons(prev => [newCoupon, ...prev]);
      }

      setReferrals(prev => prev.map(r => {
          if (r.id === referralId) {
              return {
                  ...r,
                  couponReward: 0
              };
          }
          return r;
      }));
  };

  const handleAddCoupon = (coupon: Coupon) => {
    setCoupons(prev => [coupon, ...prev]);
  };

  const handleUpdateCoupon = (updatedCoupon: Coupon) => {
    setCoupons(prev => prev.map(c => c.id === updatedCoupon.id ? updatedCoupon : c));
  };

  const handleDeleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

//   const handleCreateManufacturingOrder = (newOrder: ManufacturingOrder) => {
//       setManufacturingOrders(prev => [newOrder, ...prev]);
//   };

  const handleAddSampleProduct = (newSample: ManufacturingSample) => {
      setManufacturingSamples(prev => [newSample, ...prev]);
  };

  const handleUpdateManufacturingStatus = (orderId: string, status: ManufacturingOrder['status'], note?: string) => {
      setManufacturingOrders(prev => prev.map(order => {
          if (order.id === orderId) {
              return {
                  ...order,
                  status,
                  updates: [
                      ...(order.updates || []),
                      {
                          date: new Date().toISOString().split('T')[0],
                          status,
                          note: note || `Status updated to ${status}`
                      }
                  ]
              };
          }
          return order;
      }));
  };

  const handleUpdateManufacturingOrder = (updatedOrder: ManufacturingOrder) => {
      setManufacturingOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
  };

  const handleDeleteManufacturingOrder = (orderId: string) => {
      setManufacturingOrders(prev => prev.filter(order => order.id !== orderId));
  };

  const handleUpdatePaymentStatus = (paymentId: string, status: 'Settled' | 'Pending') => {
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status } : p));
  };

  // Reward System Handlers
  const handleAddReward = (newReward: RewardItem) => {
      setRewards(prev => [newReward, ...prev]);
  };

  const handleUpdateReward = (updatedReward: RewardItem) => {
      setRewards(prev => prev.map(r => r.id === updatedReward.id ? updatedReward : r));
  };

  const handleDeleteReward = (id: string) => {
      setRewards(prev => prev.filter(r => r.id !== id));
  };

  const handleAdjustPoints = (retailerId: string, amount: number, type: 'Add' | 'Deduct', reason: string) => {
      setRetailerRewardsProfiles(prev => prev.map(profile => {
          if (profile.retailerId === retailerId) {
              const adjustment = type === 'Add' ? amount : -amount;
              const newBalance = profile.currentBalance + adjustment;
              
              return {
                  ...profile,
                  currentBalance: newBalance,
                  totalPointsEarned: type === 'Add' ? profile.totalPointsEarned + amount : profile.totalPointsEarned,
                  transactions: [
                      {
                          id: `TXN-ADJ-${Date.now()}`,
                          retailerId,
                          type: 'Adjustment',
                          amount: adjustment,
                          date: new Date().toISOString().split('T')[0],
                          description: reason,
                          balanceAfter: newBalance
                      },
                      ...profile.transactions
                  ]
              };
          }
          return profile;
      }));
  };

  const handleCompleteRedemption = (transactionId: string) => {
      setRetailerRewardsProfiles(prev => prev.map(profile => ({
          ...profile,
          transactions: profile.transactions.map(t => 
              t.id === transactionId ? { ...t, status: 'Completed' } : t
          )
      })));
  };

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Wholesaler Management Handlers
  const handleWholesalerStatusChange = (id: string, newStatus: 'Active' | 'Suspended') => {
      setWholesalers(prev => prev.map(w => w.id === id ? { ...w, status: newStatus } : w));
      
      if (newStatus === 'Suspended') {
          setAllProducts(prev => prev.map(p => 
              p.wholesalerId === id 
              ? { ...p, status: 'Suspended', visibility: 'Private' }
              : p
          ));
      }

      handleAddNotification({
          userId: id,
          title: `Account ${newStatus}`,
          message: `Wholesaler account has been marked as ${newStatus}.`,
          type: newStatus === 'Active' ? 'success' : 'error'
      });
  };

  const handleAddWholesaler = (newWholesaler: Wholesaler) => {
      setWholesalers(prev => [newWholesaler, ...prev]);
  };

  const handleAddRetailer = (newRetailer: Retailer) => {
      setRetailers(prev => [newRetailer, ...prev]);
  };

  const handleDeleteRetailer = (id: string) => {
      setRetailers(prev => prev.filter(r => r.id !== id));
  };

  const handleDeleteWholesaler = (id: string) => {
      setWholesalers(prev => prev.filter(w => w.id !== id));
  };

  const handleRetailerStatusChange = (id: string, newStatus: 'Active' | 'Suspended') => {
      setRetailers(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      handleAddNotification({
          userId: id,
          title: `Account ${newStatus}`,
          message: `Retailer account has been marked as ${newStatus}.`,
          type: newStatus === 'Active' ? 'success' : 'error'
      });
  };

  const handleUpdateRetailer = (updatedRetailer: Retailer) => {
      setRetailers(prev => prev.map(r => r.id === updatedRetailer.id ? updatedRetailer : r));
  };

  const handleUpdateWholesaler = (updatedWholesaler: Wholesaler) => {
      setWholesalers(prev => prev.map(w => w.id === updatedWholesaler.id ? updatedWholesaler : w));
  };

  // Product Management Handlers
  const handleAddProduct = (newProduct: Product) => {
      setAllProducts(prev => [newProduct, ...prev]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
      setAllProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      if (updatedProduct.status === 'Approved') {
          handleAddNotification({
              userId: updatedProduct.wholesalerId,
              title: 'Product Approved',
              message: `Product ${updatedProduct.name} has been approved and is now live!`,
              type: 'success'
          });
      } else if (updatedProduct.status === 'Rejected') {
          handleAddNotification({
              userId: updatedProduct.wholesalerId,
              title: 'Product Rejected',
              message: `Product ${updatedProduct.name} was rejected. Please review our guidelines.`,
              type: 'error'
          });
      }
  };

  const handleSettleOrder = (orderId: string, paymentMethod: string) => {
      setOrders(prev => prev.map(order => {
          if (order.id === orderId) {
              return {
                  ...order,
                  status: 'Settled',
                  logs: [...(order.logs || []), { status: 'Settled', timestamp: new Date().toISOString(), note: `Settled via ${paymentMethod}` }]
              };
          }
          return order;
      }));

      const order = orders.find(o => o.id === orderId);
      if (order) {
          const newPayment: PaymentRecord = {
              id: `TXN-${Math.floor(Math.random() * 100000)}`,
              orderId: order.id,
              amount: order.amount,
              commission: order.margin || 0,
              netPayable: order.amount - (order.margin || 0),
              status: 'Settled',
              date: new Date().toISOString().replace('T', ' ').substring(0, 16),
              wholesalerId: order.wholesalerName === 'Unknown Wholesaler' ? 'WHL-001' : 'WHL-001'
          };
          setPayments(prev => [newPayment, ...prev]);
      }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard retailers={retailers} wholesalers={wholesalers} orders={orders} />;
      case 'retailers': return <Retailers retailers={retailers} onAddRetailer={handleAddRetailer} onUpdateStatus={handleRetailerStatusChange} onUpdateRetailer={handleUpdateRetailer} />;
      case 'wholesalers': return <Wholesalers wholesalers={wholesalers} products={allProducts} onUpdateStatus={handleWholesalerStatusChange} onAddWholesaler={handleAddWholesaler} onUpdateWholesaler={handleUpdateWholesaler} />;
      case 'products': return <Products products={allProducts} onUpdateProduct={handleUpdateProduct} onAddProduct={handleAddProduct} />;
     
      case 'messages': return <Messages 
          userRole="Super Admin" 
          currentUserId="ADMIN" 
          currentUserName="BepariBD Support" 
          messages={messages} 
          onSendMessage={handleSendMessage}
          retailers={retailers}
          wholesalers={wholesalers}
      />;
      case 'manufacturing': return <AdminManufacturing 
          orders={manufacturingOrders} 
          onUpdateStatus={handleUpdateManufacturingStatus} 
          onUpdateOrder={handleUpdateManufacturingOrder}
          onDeleteOrder={handleDeleteManufacturingOrder}
          samples={manufacturingSamples}
          onAddSample={handleAddSampleProduct}
          custom3DModel={custom3DModel}
          onUpdateCustomModel={setCustom3DModel}
          fabricGSMOptions={fabricGSMOptions}
          onUpdateFabricGSMOptions={setFabricGSMOptions}
      />;
      case 'rewards': return <AdminRewards 
          settings={rewardSettings}
          onUpdateSettings={setRewardSettings}
          rewards={rewards}
          onAddReward={handleAddReward}
          onUpdateReward={handleUpdateReward}
          onDeleteReward={handleDeleteReward}
          retailerProfiles={retailerRewardsProfiles}
          onAdjustPoints={handleAdjustPoints}
          retailers={retailers}
          onCompleteRedemption={handleCompleteRedemption}
      />;
      case 'coupons': return <AdminCoupons coupons={coupons} onAddCoupon={handleAddCoupon} onUpdateCoupon={handleUpdateCoupon} onDeleteCoupon={handleDeleteCoupon} />;
      case 'referrals': return <AdminReferrals settings={referralSettings} onUpdateSettings={setReferralSettings} referrals={referrals} onAddPayment={handleAddReferralPayment} payments={referralPayments} onSendCoupon={handleSendCoupon} />;
     
      case 'hr': return <AdminHR />;
      case 'analytics': return <AdminAnalytics orders={orders} retailers={retailers} wholesalers={wholesalers} products={allProducts} payments={payments} />;
      case 'fraud': return <AdminFraudMonitor wholesalers={wholesalers} retailers={retailers} onUpdateWholesalerStatus={handleWholesalerStatusChange} onUpdateRetailerStatus={handleRetailerStatusChange} />;
      case 'payments': return <AdminPayments payments={payments} orders={orders} onUpdatePaymentStatus={handleUpdatePaymentStatus} onSettleOrder={handleSettleOrder} />;
    
      case 'audit': return <AdminAuditLogs />;
      case 'sales-brain': return <AdminSalesBrain retailers={retailers} />;
      case 'settings': return <AdminSettings 
          retailers={retailers} 
          wholesalers={wholesalers} 
          onAddRetailer={handleAddRetailer}
          onUpdateRetailer={handleUpdateRetailer}
          onDeleteRetailer={handleDeleteRetailer}
          onAddWholesaler={handleAddWholesaler}
          onUpdateWholesaler={handleUpdateWholesaler}
          onDeleteWholesaler={handleDeleteWholesaler}
      />;
      default:
        return (
            <div className="flex items-center justify-center h-[60vh] text-slate-400 flex-col gap-4">
                <div className="text-6xl">🚧</div>
                <h2 className="text-xl font-medium">Module Under Construction</h2>
                <p className="text-sm">This enterprise module is coming in the next sprint.</p>
            </div>
        );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">BEPARIBD</h1>
                <p className="text-slate-500 text-sm">Admin Portal — Sign in to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 mb-6">
                {loginError && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                        {loginError}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input 
                        type="email" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="admin@beparibd.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input 
                        type="password" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="••••••••"
                    />
                </div>
                <button 
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
                >
                    Sign In
                </button>
            </form>

            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <p className="font-bold mb-2 text-slate-800">Demo Credentials:</p>
                <ul className="space-y-1">
                    <li><strong>Admin:</strong> admin@beparibd.com / admin123</li>
                </ul>
            </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-[#F5F7FA] dark:bg-[#121212] font-sans">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isOpen={sidebarOpen} 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
          <Header 
              toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              notifications={notifications.filter(n => n.userId === 'ADMIN')}
              onMarkNotificationRead={handleMarkNotificationRead}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onLogout={() => {}}
          />
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
              {renderContent()}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;