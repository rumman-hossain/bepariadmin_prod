import React from 'react';

export type UserRole = 'Super Admin' | 'Admin' | 'Finance' | 'Operations' | 'Viewer' | 'Wholesaler' | 'Retailer';

export type ProductStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Out of Stock' | 'Archived' | 'Suspended';

export type OrderStatus =
  | 'Created'
  | 'Pending Supplier Response'
  | 'Supplier Accepted'
  | 'Awaiting Partial Payment'
  | 'Payment Verified'
  | 'Confirmed'
  | 'Label Generated'
  | 'Parcel is Ready'
  | 'Dispatched'
  | 'Delivered'
  | 'Settled'
  | 'Cancelled'
  | 'Auto-Reassigned'
  | 'Rejected'
  | 'Refunded'; // Added Rejected for explicit supplier action

export interface KPI {
  label: string;
  value: string;
  trend: number;
  isCurrency?: boolean;
}

export interface Retailer {
  id: string;
  shopName: string;
  ownerName: string;
  district: string;
  category: string[]; // Changed to array for multiple categories
  status: 'Active' | 'Pending' | 'Suspended';
  creditScore: number;
  totalGMV: number;
  riskScore: number;
  createdAt?: string;
  lastOrderDate?: string;
  
  // Extended Details
  mobile?: string;
  username?: string;
  password?: string;
  address?: string; // Full address in Bangladeshi format
  bkash?: string;
  bankDetails?: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      branch: string;
      routing: string;
  };
  documents?: {
      name: string;
      type: 'Trade License' | 'TIN' | 'VAT' | 'NID';
      status: 'Pending' | 'Verified' | 'Rejected';
      url?: string;
  }[];
  
  // Analytical Details
  locationRanking?: 'Main Goli (5 star)' | 'Near Main Goli (4 star)' | 'Far from main goli (3 star)' | string;
  estimatedMonthlySale?: 'Excellent' | 'High' | 'Medium' | 'Low';
  yearsInBusiness?: number;
  shopType?: 'Big' | 'Medium' | 'Small' | string;
  shopDecorType?: 'Very Nice' | 'Nice' | 'Less Nice' | string;
  shopPhotoUrl?: string;
  latitude?: number;
  longitude?: number;
  
  // Sales Brain & Segmentation
  valueSegment?: string;
  behaviorSegment?: string;
  score?: number;
  monthlySales?: number;
  lastVisit?: string;
  orderStatus?: string;
  scoreBreakdown?: {
      login: number;
      browsing: number;
      orders: number;
      payment: number;
      rewards: number;
  };
}

export interface Wholesaler {
  id: string;
  /** Human-readable supplier code from backend (e.g. WHL-00042) */
  code?: string;
  companyName: string;
  category: string;
  location: string;
  status: 'Active' | 'Review' | 'Suspended' | 'Rejected';
  acceptanceRate?: number;
  dispatchSpeed?: string;
  riskScore?: number;
  createdAt?: string;
  
  // Extended Details for Onboarding
  ownerName?: string;
  shopName?: string;
  mobile?: string;
  email?: string;
  address?: string;
  bkash?: string;
  commissionRate?: number;
  logoUrl?: string;
  digitalWallet?: {
    walletType: string;
    accountNumber: string;
  };
  bankDetails?: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      branch: string;
      routing: string;
  };
  documents?: {
      name: string;
      date?: string;
      status: string;
      fileUrl?: string;
  }[];
  addresses?: {
    id?: string;
    addressType: 'primary' | 'warehouse' | 'return' | 'billing';
    division?: string;
    district: string;
    postalCode: string;
    addressLine: string;
    isDefault: boolean;
  }[];
  bankDetailsList?: {
    id?: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch?: string;
    routing?: string;
    isDefault: boolean;
  }[];
  digitalWallets?: {
    id?: string;
    walletType: 'bkash' | 'nagad' | 'rocket' | 'upay';
    accountNumber: string;
    isDefault: boolean;
  }[];
}

export interface Order {
  id: string;
  retailerId: string; // Added retailerId
  retailerName: string; // In Wholesaler view, this might be masked or just "Retailer #123"
  wholesalerName: string;
  amount: number; // Final selling amount
  baseCost?: number; // Hidden from Retailer
  margin?: number; // Platform profit
  status: OrderStatus;
  date: string;
  deadline?: string; // For pending response
  items?: string;
  dispatchBy?: string;
  logs?: OrderLog[];
  shippingLabelUrl?: string; // Added for shipping label functionality
  collectedAdvance?: number; // Amount collected as advance
  collectedShipping?: number; // Amount collected for shipping
  shippingMedium?: string; // e.g. Pathao, Steadfast
  trackingId?: string; // Tracking ID from courier
}

export interface OrderLog {
    status: OrderStatus;
    timestamp: string;
    note?: string;
}

export interface ProductVariation {
  id: string;
  color?: string;
  design?: string;
  subName: string;
  subSku: string;
  photoUrl?: string;
  videoUrl?: string;
  price?: number;
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string; // Auto-generated: Wholesalers id - Category Code (2 letter) - Sub-category Code (2 letter) - Product group (2 letter) - Sequence (001–999) - variation color (2 letter) - variation Design (2 letter)
  category: string;
  subCategory?: string;
  productGroup?: string;
  basePrice: number; // Wholesaler input
  margin: number; // Platform margin percentage (e.g., 15)
  sellingPrice: number; // Auto-calculated: Base + (Base * Margin%)
  stock: number; // Total physical stock
  availableStock?: number; // Calculated: Stock - Reserved
  reservedStock?: number; // Held in pending orders
  moq: number;
  dispatchTime: string;
  trendTags?: string[];
  visibility: 'Public' | 'Private';
  wholesalerId: string;
  status: ProductStatus;
  imageUrl: string;
  imageUrls?: string[];
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  variations?: ProductVariation[];
  
  // Basic Details
  description?: string;
  brandName?: string;
  unitType?: string;
  material?: string;
  color?: string;
  weight?: string;
  volume?: string;
  availableSizes?: string[];
  moqSet?: Record<string, number>;
  
  // Media & Variations
  videoUrl?: string;
  bundleDetails?: {
    isBundle: boolean;
    description?: string;
  };
  
  // Frontend helpers
  estimatedProfit?: number; 
  isTrending?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  featuredUntil?: string;
  discountPercentage?: number;
  isSponsored?: boolean;
  sponsoredUntil?: string;
}

export interface MessageAttachment {
  type: 'image' | 'video' | 'file';
  url: string;
  name: string;
  size?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  receiverId: string;
  receiverName: string;
  receiverRole: UserRole;
  content: string;
  timestamp: string;
  read: boolean;
  attachment?: MessageAttachment;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  commission: number;
  netPayable: number;
  status: 'Settled' | 'Pending';
  date: string;
  wholesalerId: string;
}

export interface CartItem extends Product {
  quantity: number;
  variationId?: string;
  variationName?: string;
  photoUrl?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'Payment' | 'Refund' | 'Bonus';
  amount: number;
  date: string;
  description: string;
}

export interface ExpenseRecord {
  id: string;
  category: 'Marketing' | 'Operations' | 'Salary' | 'Rent' | 'Software' | 'Logistics' | 'Office';
  amount: number;
  date: string;
  description: string;
  status: 'Paid' | 'Pending';
  paymentMethod: 'Bank' | 'Cash' | 'Mobile Money';
}

export interface ManufacturingOrder {
  id: string;
  retailerId: string;
  retailerName: string;
  retailerImage?: string; // Added retailer photo
  brandName: string;
  productCategory: string;
  productImage?: string; // Added product photo
  quantity: number;
  targetPricePerUnit: number;
  specifications: string;
  designImage?: string;
  status: 'Requested' | 'Quotation Sent' | 'Production' | 'Quality Check' | 'Completed';
  requestDate: string;
  deliveryDate?: string;
  updates?: { date: string; status: string; note: string }[];
}

export interface ManufacturingSample {
    id: string;
    name: string;
    category: string;
    price: number;
    moq: number;
    description: string;
    image: string;
    specifications: string[];
}

export interface RewardSettings {
    earningRate: number; // Points per currency unit (e.g., 1 point per 100 Taka)
    minRedeemPoints: number;
    expiryDurationDays: number;
}

export interface RewardItem {
    id: string;
    title: string;
    description: string;
    pointsCost: number;
    type: 'Discount' | 'Gift' | 'Cashback';
    value?: number; // For Discount/Cashback
    image?: string;
    status: 'Active' | 'Inactive';
}

export interface PointTransaction {
    id: string;
    retailerId: string;
    type: 'Earned' | 'Redeemed' | 'Adjustment' | 'Expired';
    amount: number;
    date: string;
    orderId?: string;
    description: string;
    balanceAfter: number;
    status?: 'Redeemed' | 'Completed'; // Added status for redemption tracking
}

export interface RetailerRewardsProfile {
    retailerId: string;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    currentBalance: number;
    transactions: PointTransaction[];
}

export interface Coupon {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minPurchase?: number;
    maxDiscount?: number;
    usageLimit?: number;
    usedCount: number;
    expiryDate: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

export interface ReferralSettings {
    commissionRate: number; // Percentage of order value
    isActive: boolean;
    minOrderValue: number; // Minimum order value to trigger commission
    bonusAmount?: number; // One-time bonus for first order
}

export interface ReferralRecord {
    id: string;
    referrerId: string;
    referrerName: string; // Added referrerName
    refereeId: string;
    refereeName: string;
    status: 'Pending' | 'Active' | 'Completed';
    totalEarnings: number;
    cashReward: number; // Added cashReward
    couponReward: number; // Added couponReward
    joinedDate: string;
    lastOrderDate?: string;
}

export interface ShippingRate {
  id: string;
  maxWeight: number;
  price: number;
  updatedAt: string;
}

export interface ReferralPayment {
    id: string;
    referralId: string;
    referrerName: string;
    amount: number;
    method: 'Cash' | 'Bank' | 'Bkash' | 'Nagad';
    date: string;
    status: 'Completed';
    transactionId?: string;
}