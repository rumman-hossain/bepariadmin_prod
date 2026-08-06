

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

  /**
   * What the list shows about a supplier without opening it.
   *
   * `documentsOnFile` counts certificates with bytes behind them, out of the
   * four required — a count rather than a boolean because "3 of 4" and "0 of 4"
   * are different conversations.
   *
   * `createdBy` is SELF or ADMIN: whether they registered themselves or somebody
   * transcribed them from a phone call. Those two rows deserve different amounts
   * of trust.
   *
   * `deletedAt` is set only on a removed supplier, and only the Removed view
   * returns one.
   */
  documentsOnFile?: number;
  hasProducts?: boolean;
  createdBy?: 'SELF' | 'ADMIN';
  deletedAt?: string;
  
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
      /** The row id — what the document-URL endpoint is asked for. */
      id: string;
      /** `trade`, `tin`, `vat`, `nid` — what the vault labels the row by. */
      docType: string;
      name: string;
      date?: string;
      status: string;
      /**
       * Whether an object exists, NOT where it is.
       *
       * The server used to send `fileUrl` — the private-bucket object path — for
       * every supplier document. Presence is the only thing a screen needs; the
       * address is minted per request and served through /api/v1/doc.
       */
      hasFile: boolean;
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
  retailerName: string; // In the wholesaler view this may be masked, e.g. "Retailer 123"
  wholesalerName: string;
  amount: number; // Final selling amount
  baseCost?: number; // Hidden from Retailer
  margin?: number; // Platform profit
  status: OrderStatus;
  date: string;
  deadline?: string; // For pending response
  items?: string;
  dispatchBy?: string;
  shippingLabelUrl?: string; // Added for shipping label functionality
  collectedAdvance?: number; // Amount collected as advance
  collectedShipping?: number; // Amount collected for shipping
  shippingMedium?: string; // e.g. Pathao, Steadfast
  trackingId?: string; // Tracking ID from courier
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

