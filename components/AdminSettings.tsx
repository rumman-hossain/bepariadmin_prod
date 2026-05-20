import React, { useState, useMemo } from 'react';
import { 
  User, Shield, Phone, Store, CreditCard, Bell, Globe, 
  Lock, CheckCircle, Palette, Package, Users, HelpCircle,
  Save, Upload, Smartphone, Mail, Building, FileText,
  Eye, EyeOff, AlertTriangle, Download, Trash2, Plus,
  MessageSquare, Search
} from 'lucide-react';
import { Card } from './ui/Card';
import { Retailer, Wholesaler } from '../src/types/domain';

const SETTINGS_CATEGORIES = [
  { id: 'profile', label: 'Account & Profile', icon: User },
  { id: 'security', label: 'Security & Auth', icon: Shield },
  { id: 'contact', label: 'Contact & Comm', icon: Phone },
  { id: 'business', label: 'Business / Store', icon: Store },
  { id: 'payment', label: 'Payment & Banking', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'localization', label: 'Language & Local', icon: Globe },
  { id: 'privacy', label: 'Privacy & Data', icon: Lock },
  { id: 'verification', label: 'Trust & Verify', icon: CheckCircle },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'shipping', label: 'Order & Shipping', icon: Package },
  { id: 'team', label: 'Team & Sub-accounts', icon: Users },
  { id: 'wholesaler_retailer', label: 'Wholesaler & Retailer Accounts', icon: Building },
  { id: 'support', label: 'Help & Support', icon: HelpCircle },
];

interface AdminSettingsProps {
  retailers: Retailer[];
  wholesalers: Wholesaler[];
  onAddRetailer: (retailer: Retailer) => void;
  onUpdateRetailer: (retailer: Retailer) => void;
  onDeleteRetailer: (id: string) => void;
  onAddWholesaler: (wholesaler: Wholesaler) => void;
  onUpdateWholesaler: (wholesaler: Wholesaler) => void;
  onDeleteWholesaler: (id: string) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ 
  retailers, 
  wholesalers,
  onAddRetailer,
  onUpdateRetailer,
  onDeleteRetailer,
  onAddWholesaler,
  onUpdateWholesaler,
  onDeleteWholesaler
}) => {
  const [activeCategory, setActiveCategory] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: 'Admin User', email: 'admin@beparibd.com', role: 'Owner', status: 'Active', password: 'password123' },
    { id: 2, name: 'Manager One', email: 'manager@beparibd.com', role: 'Manager', status: 'Active', password: 'password123' },
  ]);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [currentMember, setCurrentMember] = useState<Record<string, string | number> | null>(null);

  const wholesalerRetailerAccounts = useMemo(() => {
    const w = wholesalers.map(wh => ({
      id: wh.id,
      name: wh.companyName,
      email: `${wh.id.toLowerCase()}@example.com`, // Mock email
      password: 'password123',
      type: 'Wholesaler',
      district: wh.location,
      status: wh.status
    }));
    const r = retailers.map(ret => ({
      id: ret.id,
      name: ret.shopName,
      email: `${ret.id.toLowerCase()}@example.com`, // Mock email
      password: 'password123',
      type: 'Retailer',
      district: ret.district,
      status: ret.status
    }));
    return [...w, ...r];
  }, [wholesalers, retailers]);

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Record<string, string | number> | null>(null);
  const [filterType, setFilterType] = useState('All');
  const [filterDistrict, setFilterDistrict] = useState('All');

  const renderProfileSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Account & Profile</h3>
        <p className="text-sm text-slate-500">Manage your personal and business identity.</p>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            <User className="w-12 h-12 text-slate-400" />
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors shadow-lg">
            <Upload className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h4 className="font-medium text-slate-900 dark:text-white">Profile Photo</h4>
          <p className="text-sm text-slate-500 mb-2">JPG, GIF or PNG. Max size of 800K</p>
          <button className="text-sm text-red-600 hover:text-red-700 font-medium">Remove photo</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
          <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="Admin User" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bio / Designation</label>
          <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="Super Administrator" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Business Name</label>
          <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="BepariBD Enterprise" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trade License Number</label>
          <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="TRD-2023-8921" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">NID / TIN Number</label>
          <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="1234567890" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Account Type</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Both (Buyer & Seller)</option>
            <option>Buyer Only</option>
            <option>Seller Only</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Security & Authentication</h3>
        <p className="text-sm text-slate-500">Protect your account and manage access.</p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-slate-900 dark:text-white">Change Password</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="hidden md:block"></div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
            <input type={showPassword ? "text" : "password"} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
            <input type={showPassword ? "text" : "password"} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">Update Password</button>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h4>
            <p className="text-sm text-slate-500">Add an extra layer of security to your account.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">Biometric Login</h4>
            <p className="text-sm text-slate-500">Use fingerprint or face recognition on supported devices.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">PIN Lock for App</h4>
            <p className="text-sm text-slate-500">Require a PIN to open the app.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      <div>
        <h4 className="font-medium text-slate-900 dark:text-white mb-4">Active Sessions</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">iPhone 13 Pro (Current)</p>
                <p className="text-xs text-slate-500">Dhaka, Bangladesh • Active now</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Chrome on Windows</p>
                <p className="text-xs text-slate-500">Chittagong, Bangladesh • Last active 2 hours ago</p>
              </div>
            </div>
            <button className="text-sm text-red-600 hover:text-red-700 font-medium">Log out</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Contact & Communication</h3>
        <p className="text-sm text-slate-500">Manage how we and your customers contact you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Primary Phone Number</label>
          <input type="tel" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="+880 1712-345678" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Backup Phone Number</label>
          <input type="tel" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="+880 1XXXXXXXXX" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
          <input type="email" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="admin@beparibd.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">WhatsApp Number</label>
          <input type="tel" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="+880 1712-345678" />
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      <div>
        <h4 className="font-medium text-slate-900 dark:text-white mb-4">Business Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">District</label>
            <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
              <option>Dhaka</option>
              <option>Chittagong</option>
              <option>Sylhet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upazila / Thana</label>
            <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
              <option>Gulshan</option>
              <option>Banani</option>
              <option>Mirpur</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Area / Road</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="Road 11, Block C" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Address</label>
            <textarea className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" rows={3} defaultValue="House 12, Road 11, Block C, Gulshan-1, Dhaka 1212"></textarea>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Business / Store Settings</h3>
        <p className="text-sm text-slate-500">Configure your storefront and business rules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Shop Name</label>
          <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="BepariBD Official Store" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Shop Category</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Clothing & Apparel</option>
            <option>Electronics</option>
            <option>Groceries</option>
            <option>General Merchandise</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Shop Description</label>
          <textarea className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" rows={3} defaultValue="The official BepariBD store offering premium quality products at wholesale prices."></textarea>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Minimum Order Quantity (MOQ)</label>
          <input type="number" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="10" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Business Hours</label>
          <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="Sat-Thu: 9:00 AM - 8:00 PM" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Return & Refund Policy</label>
          <textarea className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" rows={3} defaultValue="7-day return policy for defective items. Refunds processed within 3-5 business days."></textarea>
        </div>
      </div>
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Payment & Banking</h3>
        <p className="text-sm text-slate-500">Manage your payout methods and billing details.</p>
      </div>

      <div>
        <h4 className="font-medium text-slate-900 dark:text-white mb-4">Bank Account Details (For Payouts)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bank Name</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="City Bank Limited" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Branch Name</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="Gulshan Branch" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Account Name</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="BepariBD Enterprise" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Account Number</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="11029384756" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Routing Number</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="225275151" />
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      <div>
        <h4 className="font-medium text-slate-900 dark:text-white mb-4">Mobile Banking (MFS)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">bKash Number</label>
            <input type="tel" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="01712345678" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nagad Number</label>
            <input type="tel" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Rocket Number</label>
            <input type="tel" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="01XXXXXXXXX" />
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      <div>
        <h4 className="font-medium text-slate-900 dark:text-white mb-4">Tax & VAT Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">VAT Registration Number (BIN)</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="000123456-0101" />
          </div>
          <div className="flex items-center mt-8">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Prices include VAT</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Notifications</h3>
        <p className="text-sm text-slate-500">Choose what updates you want to receive.</p>
      </div>

      <div className="space-y-4">
        {[
          { title: 'Push Notifications', desc: 'Receive alerts for new orders, messages, and offers on your device.', default: true },
          { title: 'SMS Alerts', desc: 'Get important updates via SMS (e.g., OTP, critical order updates).', default: true },
          { title: 'Promotional Offers', desc: 'Receive news about deals, discounts, and platform updates.', default: false },
          { title: 'System Maintenance', desc: 'Get notified about scheduled downtime and platform upgrades.', default: true },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">{item.title}</h4>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked={item.default} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Digest Frequency</label>
        <select className="w-full md:w-1/2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
          <option>Daily</option>
          <option>Weekly</option>
          <option>Never</option>
        </select>
      </div>
    </div>
  );

  const renderLocalizationSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Language & Localization</h3>
        <p className="text-sm text-slate-500">Customize your regional preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Language</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>English</option>
            <option>বাংলা (Bengali)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Currency Display</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>BDT (৳)</option>
            <option>USD ($)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date & Time Format</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>DD/MM/YYYY, 12-hour</option>
            <option>MM/DD/YYYY, 12-hour</option>
            <option>YYYY-MM-DD, 24-hour</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Regional Unit Preferences</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Metric (kg, liter, meter)</option>
            <option>Local (maund, seer)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Privacy & Data</h3>
        <p className="text-sm text-slate-500">Control your data visibility and privacy.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Profile Visibility</label>
          <select className="w-full md:w-1/2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Public (Visible to everyone)</option>
            <option>Verified Users Only</option>
            <option>Private (Hidden)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Who can see your contact info?</label>
          <select className="w-full md:w-1/2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Only users with active orders</option>
            <option>All registered users</option>
            <option>No one (Use platform messaging only)</option>
          </select>
        </div>

        <hr className="border-slate-200 dark:border-slate-800" />

        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">Cookie & Tracking Preferences</h4>
            <p className="text-sm text-slate-500">Allow analytics cookies to help us improve the platform.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" />
            Request Data Download
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );

  const renderVerificationSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Trust & Verification</h3>
        <p className="text-sm text-slate-500">Manage your KYC documents and verification badges.</p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-start gap-4">
        <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-emerald-800 dark:text-emerald-400">Account Verified</h4>
          <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">Your identity and business documents have been verified. You are eligible for the "Verified Seller" badge.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-slate-900 dark:text-white">Uploaded Documents</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">National ID (Front & Back)</p>
                <p className="text-xs text-emerald-600 font-medium">Verified</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-emerald-600"><Eye className="w-4 h-4" /></button>
          </div>
          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">Trade License (2023-2024)</p>
                <p className="text-xs text-emerald-600 font-medium">Verified</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-emerald-600"><Eye className="w-4 h-4" /></button>
          </div>
        </div>
        <button className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
          <Plus className="w-4 h-4" /> Upload New Document
        </button>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Appearance</h3>
        <p className="text-sm text-slate-500">Customize how the application looks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>System Default</option>
            <option>Light Mode</option>
            <option>Dark Mode</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dashboard Layout</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Standard</option>
            <option>Compact (More data)</option>
            <option>Spacious (Larger elements)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Font Size</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Medium (Default)</option>
            <option>Large</option>
            <option>Extra Large</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderShippingSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Order & Shipping Preferences</h3>
        <p className="text-sm text-slate-500">Set your default logistics and order handling rules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Delivery / Pickup Address</label>
          <textarea className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" rows={2} defaultValue="Warehouse 3, Tejgaon Industrial Area, Dhaka"></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Preferred Courier Partner</label>
          <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Steadfast Logistics</option>
            <option>Pathao Courier</option>
            <option>RedX</option>
            <option>eCourier</option>
          </select>
        </div>
        <div className="flex items-center mt-8">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
            <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Auto-confirm new orders (Skip manual review)</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderTeamSettings = () => {
    if (isEditingMember) {
      return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {currentMember?.id ? 'Edit Member' : 'Add Member'}
              </h3>
              <p className="text-sm text-slate-500">Manage user details and credentials.</p>
            </div>
            <button 
              onClick={() => setIsEditingMember(false)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
          </div>

          <form 
            className="space-y-4 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              if (currentMember.id) {
                setTeamMembers(teamMembers.map(m => m.id === currentMember.id ? currentMember : m));
              } else {
                setTeamMembers([...teamMembers, { ...currentMember, id: Date.now() }]);
              }
              setIsEditingMember(false);
            }}
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input 
                type="text" 
                required
                value={currentMember?.name || ''}
                onChange={e => setCurrentMember({...currentMember, name: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email (Username)</label>
              <input 
                type="email" 
                required
                value={currentMember?.email || ''}
                onChange={e => setCurrentMember({...currentMember, email: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input 
                type="text" 
                required
                value={currentMember?.password || ''}
                onChange={e => setCurrentMember({...currentMember, password: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select 
                value={currentMember?.role || 'Manager'}
                onChange={e => setCurrentMember({...currentMember, role: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              >
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
                <option value="Support">Support</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select 
                value={currentMember?.status || 'Active'}
                onChange={e => setCurrentMember({...currentMember, status: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="pt-4 flex gap-3">
              <button 
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Save Member
              </button>
              {currentMember?.id && currentMember.role !== 'Owner' && (
                <button 
                  type="button"
                  onClick={() => {
                    setTeamMembers(teamMembers.filter(m => m.id !== currentMember.id));
                    setIsEditingMember(false);
                  }}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Team & Sub-accounts</h3>
            <p className="text-sm text-slate-500">Manage staff access and permissions.</p>
          </div>
          <button 
            onClick={() => {
              setCurrentMember({ name: '', email: '', role: 'Manager', status: 'Active', password: '' });
              setIsEditingMember(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 text-sm font-semibold text-slate-900 dark:text-white">Name</th>
                <th className="p-4 text-sm font-semibold text-slate-900 dark:text-white">Role</th>
                <th className="p-4 text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {teamMembers.map((member) => (
                <tr key={member.id}>
                  <td className="p-4">
                    <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      member.role === 'Owner' ? 'bg-purple-100 text-purple-700' :
                      member.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      member.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => {
                        setCurrentMember(member);
                        setIsEditingMember(true);
                      }}
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderWholesalerRetailerSettings = () => {
    if (isEditingAccount) {
      return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {currentAccount?.id ? 'Edit Account' : 'Add Account'}
              </h3>
              <p className="text-sm text-slate-500">Manage wholesaler or retailer credentials.</p>
            </div>
            <button 
              onClick={() => setIsEditingAccount(false)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
          </div>

          <form 
            className="space-y-4 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              if (currentAccount && currentAccount.id) {
                // Update existing
                if (currentAccount.type === 'Wholesaler') {
                  const existing = wholesalers.find(w => w.id === currentAccount.id);
                  if (existing) {
                    onUpdateWholesaler({
                      ...existing,
                      companyName: String(currentAccount.name || existing.companyName),
                      location: String(currentAccount.district || existing.location),
                      status: String(currentAccount.status || existing.status) as 'Active' | 'Review' | 'Suspended'
                    });
                  }
                } else {
                  const existing = retailers.find(r => r.id === currentAccount.id);
                  if (existing) {
                    onUpdateRetailer({
                      ...existing,
                      shopName: String(currentAccount.name || existing.shopName),
                      district: String(currentAccount.district || existing.district),
                      status: String(currentAccount.status || existing.status) as 'Active' | 'Review' | 'Suspended'
                    });
                  }
                }
              } else if (currentAccount) {
                // Add new
                if (currentAccount.type === 'Wholesaler') {
                  onAddWholesaler({
                    id: `WHL-${Math.floor(Math.random() * 10000)}`,
                    companyName: String(currentAccount.name || ''),
                    category: 'General',
                    location: String(currentAccount.district || ''),
                    status: String(currentAccount.status || 'Active') as 'Active' | 'Review' | 'Suspended',
                    rating: 5.0,
                    totalOrders: 0,
                    joinedDate: new Date().toISOString().split('T')[0]
                  });
                } else {
                  onAddRetailer({
                    id: `RET-${Math.floor(Math.random() * 10000)}`,
                    shopName: String(currentAccount.name || ''),
                    ownerName: 'New Owner',
                    district: String(currentAccount.district || ''),
                    category: 'General',
                    status: String(currentAccount.status || 'Active') as 'Active' | 'Review' | 'Suspended',
                    totalOrders: 0,
                    totalSpent: 0,
                    joinedDate: new Date().toISOString().split('T')[0]
                  });
                }
              }
              setIsEditingAccount(false);
            }}
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Business Name</label>
              <input 
                type="text" 
                required
                value={currentAccount?.name || ''}
                onChange={e => setCurrentAccount({...currentAccount, name: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username (Email)</label>
              <input 
                type="email" 
                required
                value={currentAccount?.email || ''}
                onChange={e => setCurrentAccount({...currentAccount, email: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input 
                type="text" 
                required
                value={currentAccount?.password || ''}
                onChange={e => setCurrentAccount({...currentAccount, password: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Type</label>
              <select 
                value={currentAccount?.type || 'Wholesaler'}
                onChange={e => setCurrentAccount({...currentAccount, type: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              >
                <option value="Wholesaler">Wholesaler</option>
                <option value="Retailer">Retailer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">District</label>
              <input 
                type="text" 
                required
                value={currentAccount?.district || ''}
                onChange={e => setCurrentAccount({...currentAccount, district: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
                placeholder="e.g. Dhaka"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select 
                value={currentAccount?.status || 'Active'}
                onChange={e => setCurrentAccount({...currentAccount, status: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-black"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="pt-4">
              <button 
                type="submit"
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      );
    }

    const filteredAccounts = wholesalerRetailerAccounts.filter(acc => {
      const typeMatch = filterType === 'All' || acc.type === filterType;
      const districtMatch = filterDistrict === 'All' || acc.district.toLowerCase().includes(filterDistrict.toLowerCase());
      return typeMatch && districtMatch;
    });

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Wholesaler & Retailer Accounts</h3>
            <p className="text-sm text-slate-500">Manage external partner accounts and credentials.</p>
          </div>
          <button 
            onClick={() => {
              setCurrentAccount({ name: '', email: '', password: '', type: 'Wholesaler', district: '', status: 'Active' });
              setIsEditingAccount(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter by district..."
              value={filterDistrict === 'All' ? '' : filterDistrict}
              onChange={e => setFilterDistrict(e.target.value || 'All')}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-black"
            />
          </div>
          <div className="w-full md:w-48">
            <select 
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-black"
            >
              <option value="All">All Types</option>
              <option value="Wholesaler">Wholesalers</option>
              <option value="Retailer">Retailers</option>
            </select>
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 text-sm font-semibold text-slate-900 dark:text-white">Business Info</th>
                <th className="p-4 text-sm font-semibold text-slate-900 dark:text-white">Credentials</th>
                <th className="p-4 text-sm font-semibold text-slate-900 dark:text-white">Type & District</th>
                <th className="p-4 text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="p-4">
                    <p className="font-medium text-slate-900 dark:text-white">{acc.name}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-900 dark:text-white font-mono">{acc.email}</p>
                    <p className="text-xs text-slate-500 font-mono">{acc.password}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        acc.type === 'Wholesaler' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {acc.type}
                      </span>
                      <p className="text-xs text-slate-500">{acc.district}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      acc.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {acc.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setCurrentAccount(acc);
                          setIsEditingAccount(true);
                        }}
                        className="text-sm text-emerald-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => {
                          if (acc.type === 'Wholesaler') {
                            onDeleteWholesaler(acc.id as string);
                          } else {
                            onDeleteRetailer(acc.id as string);
                          }
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAccounts.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No accounts found matching your filters.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSupportSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Help & Support</h3>
        <p className="text-sm text-slate-500">Get assistance and provide feedback.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer group">
          <MessageSquare className="w-8 h-8 text-emerald-600 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-slate-900 dark:text-white mb-2">Live Chat Support</h4>
          <p className="text-sm text-slate-500">Chat with our support team in real-time for quick resolutions.</p>
        </div>
        <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer group">
          <HelpCircle className="w-8 h-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-slate-900 dark:text-white mb-2">Help Center & FAQ</h4>
          <p className="text-sm text-slate-500">Browse tutorials, guides, and frequently asked questions.</p>
        </div>
        <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer group">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-slate-900 dark:text-white mb-2">Report a Problem</h4>
          <p className="text-sm text-slate-500">Found a bug or issue? Let us know so we can fix it.</p>
        </div>
        <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer group">
          <Mail className="w-8 h-8 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-slate-900 dark:text-white mb-2">Feedback & Suggestions</h4>
          <p className="text-sm text-slate-500">Have an idea to improve BepariBD? We'd love to hear it.</p>
        </div>
      </div>

      <div className="pt-8 text-center text-sm text-slate-500">
        <p>BepariBD Admin Portal Version 2.4.1</p>
        <p>© 2026 BepariBD. All rights reserved.</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeCategory) {
      case 'profile': return renderProfileSettings();
      case 'security': return renderSecuritySettings();
      case 'contact': return renderContactSettings();
      case 'business': return renderBusinessSettings();
      case 'payment': return renderPaymentSettings();
      case 'notifications': return renderNotificationSettings();
      case 'localization': return renderLocalizationSettings();
      case 'privacy': return renderPrivacySettings();
      case 'verification': return renderVerificationSettings();
      case 'appearance': return renderAppearanceSettings();
      case 'shipping': return renderShippingSettings();
      case 'team': return renderTeamSettings();
      case 'wholesaler_retailer': return renderWholesalerRetailerSettings();
      case 'support': return renderSupportSettings();
      default: return renderProfileSettings();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500">Manage your account, store, and platform preferences.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm">
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0">
          <Card className="p-2 sticky top-6">
            <nav className="space-y-1">
              {SETTINGS_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    {category.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <Card className="p-6 md:p-8 min-h-[600px]">
            {renderContent()}
          </Card>
        </div>
      </div>
    </div>
  );
};
