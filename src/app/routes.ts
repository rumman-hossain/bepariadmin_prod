/**
 * Central route/menu registry.
 * Single source of truth for all navigation items.
 * Used by Sidebar and App to render page content.
 */

import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Truck,
  FileText,
  AlertOctagon,
  Settings,
  ShieldCheck,
  Briefcase,
  DollarSign,
  Factory,
  Gift,
  Tag,
  Share2,
  MessageSquare,
  BarChart2,
  Brain,
  type LucideIcon,
} from 'lucide-react';

export interface Route {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const ROUTES: Route[] = [
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