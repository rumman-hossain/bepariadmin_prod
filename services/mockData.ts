import { Retailer, Wholesaler, Order, Product, KPI, PaymentRecord, WalletTransaction, ManufacturingOrder, ManufacturingSample, ShippingRate } from '../src/types/domain';

// Admin Data
export const KPIS: KPI[] = [
  { label: 'Total GMV (Month)', value: '2,450,000', trend: 12.5, isCurrency: true },
  { label: 'Net Platform Profit', value: '185,000', trend: 8.2, isCurrency: true },
  { label: 'Active Retailers', value: '1,240', trend: 5.1 },
  { label: 'Pending Orders', value: '45', trend: -2.3 },
];

export const MOCK_RETAILERS: Retailer[] = [
  { 
      id: 'RET-001', 
      shopName: 'Mayer Doa Store', 
      ownerName: 'Rahim Uddin', 
      district: 'Dhaka', 
      category: ['Gents Textile', 'Ladies Textile'], 
      status: 'Active', 
      creditScore: 850, 
      totalGMV: 150000, 
      riskScore: 12,
      createdAt: '2023-01-15',
      lastOrderDate: '2023-10-26',
      mobile: '01711123456',
      address: '12/A, Mirpur 10, Dhaka-1216',
      bkash: '01711123456'
  },
  { 
      id: 'RET-002', 
      shopName: 'Bhai Bhai Traders', 
      ownerName: 'Karim Mia', 
      district: 'Chittagong', 
      category: ['Electronics'], 
      status: 'Active', 
      creditScore: 720, 
      totalGMV: 89000, 
      riskScore: 25,
      createdAt: '2023-03-20',
      lastOrderDate: '2023-10-26',
      mobile: '01811123456',
      address: 'Station Road, Agrabad, Chittagong'
  },
  { 
      id: 'RET-003', 
      shopName: 'Sokher Bazar', 
      ownerName: 'Nasreen Akter', 
      district: 'Sylhet', 
      category: ['General Store', 'Cosmetics & Beauty'], 
      status: 'Suspended', 
      creditScore: 400, 
      totalGMV: 12000, 
      riskScore: 85,
      createdAt: '2023-05-10',
      lastOrderDate: '2023-09-15',
      mobile: '01911123456',
      address: 'Zindabazar, Sylhet'
  },
  { 
      id: 'RET-004', 
      shopName: 'New Fashion House', 
      ownerName: 'Tariq Islam', 
      district: 'Rajshahi', 
      category: ['Footwear', 'Bags & Luggage'], 
      status: 'Pending', 
      creditScore: 0, 
      totalGMV: 0, 
      riskScore: 0,
      createdAt: '2023-10-28',
      mobile: '01611123456',
      address: 'Shaheb Bazar, Rajshahi'
  },
  { 
      id: 'RET-005', 
      shopName: 'Comilla General Store', 
      ownerName: 'Abdul Halim', 
      district: 'Comilla', 
      category: ['Home & Lifestyle'], 
      status: 'Active', 
      creditScore: 780, 
      totalGMV: 210000, 
      riskScore: 5,
      createdAt: '2023-02-05',
      lastOrderDate: '2023-10-26',
      mobile: '01511123456',
      address: 'Kandirpar, Comilla'
  },
];

export const MOCK_WHOLESALERS: Wholesaler[] = [
  { id: 'WHL-001', companyName: 'Mega Textiles Ltd', category: 'Apparel', location: 'Dhaka', status: 'Active', acceptanceRate: 98, dispatchSpeed: '24h', mobile: '01722233445', address: '45 Nawabpur Road, Dhaka', riskScore: 5 },
  { id: 'WHL-002', companyName: 'Dhaka Electronics Hub', category: 'Electronics', location: 'Dhaka', status: 'Active', acceptanceRate: 92, dispatchSpeed: '48h', mobile: '01822233445', address: 'BCC Road, Nawabpur, Dhaka', riskScore: 18 },
  { id: 'WHL-003', companyName: 'Prime Foods Corp', category: 'FMCG', location: 'Chittagong', status: 'Review', acceptanceRate: 75, dispatchSpeed: '72h', mobile: '01922233445', address: 'Khatunganj, Chittagong', riskScore: 42 },
];

// Orders now adhere to strict status workflow
export const MOCK_ORDERS: Order[] = [
  { id: 'ORD-7829', retailerId: 'RET-001', retailerName: 'Mayer Doa Store', wholesalerName: 'Mega Textiles Ltd', amount: 45000, baseCost: 38250, margin: 6750, status: 'Delivered', date: '2023-10-25', items: '30x Cotton Panjabi', logs: [] },
  { id: 'ORD-7830', retailerId: 'RET-002', retailerName: 'Bhai Bhai Traders', wholesalerName: 'Dhaka Electronics Hub', amount: 12500, baseCost: 11250, margin: 1250, status: 'Dispatched', date: '2023-10-26', items: '15x LED Bulbs', logs: [] },
  { id: 'ORD-7831', retailerId: 'RET-005', retailerName: 'Comilla General Store', wholesalerName: 'Prime Foods Corp', amount: 8200, baseCost: 7500, margin: 700, status: 'Pending Supplier Response', date: '2023-10-26', items: '20x Mustard Oil', deadline: '2h', logs: [] },
  { id: 'ORD-7832', retailerId: 'RET-001', retailerName: 'Mayer Doa Store', wholesalerName: 'Dhaka Electronics Hub', amount: 32000, baseCost: 28800, margin: 3200, status: 'Payment Verified', date: '2023-10-26', items: '5x Smart TV', logs: [] },
];

// Products now have basePrice and calculated sellingPrice
export const MOCK_PRODUCTS: Product[] = [
  { id: 'PRD-101', name: 'Cotton Panjabi Premium', sku: 'BPR-APP-839210-1023', category: 'Gents Textile', basePrice: 1200, margin: 15, sellingPrice: 1380, stock: 500, availableStock: 480, reservedStock: 20, status: 'Approved', imageUrl: 'https://picsum.photos/200', moq: 10, dispatchTime: '24h', wholesalerId: 'WHL-001', visibility: 'Public', isTrending: true, isFeatured: true },
  { id: 'PRD-102', name: 'Smart LED Bulb 12W', sku: 'BPR-ELE-102938-1023', category: 'Electronics', basePrice: 250, margin: 10, sellingPrice: 275, stock: 1200, availableStock: 1200, reservedStock: 0, status: 'Approved', imageUrl: 'https://picsum.photos/201', moq: 50, dispatchTime: '48h', wholesalerId: 'WHL-002', visibility: 'Public', isNew: true, isFeatured: true },
  { id: 'PRD-103', name: 'Organic Mustard Oil 1L', sku: 'BPR-FMC-485921-1023', category: 'Home & Lifestyle', basePrice: 180, margin: 10, sellingPrice: 198, stock: 0, availableStock: 0, reservedStock: 0, status: 'Rejected', imageUrl: 'https://picsum.photos/202', moq: 12, dispatchTime: '72h', wholesalerId: 'WHL-003', visibility: 'Private', rejectionReason: 'Improper packaging documentation' },
];

export const CHART_DATA_SALES = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
];

export const CHART_DATA_STATUS = [
  { name: 'Delivered', value: 400 },
  { name: 'Pending', value: 300 },
  { name: 'Cancelled', value: 50 },
  { name: 'Shipped', value: 200 },
];

// Wholesaler Data

export const WHOLESALER_KPIS: KPI[] = [
  { label: 'Total Earnings', value: '450,000', trend: 15.2, isCurrency: true },
  { label: 'Pending Requests', value: '3', trend: 0 },
  { label: 'Dispatch Rate', value: '98%', trend: 2.1 },
  { label: 'Performance Score', value: '92', trend: 5.0 },
];

// Consistent Product Data for Wholesaler
export const WHOLESALER_PRODUCTS: Product[] = [
    { id: 'PRD-101', name: 'Cotton Panjabi Premium', sku: 'BPR-APP-839210-1023', category: 'Gents Textile', basePrice: 1200, margin: 15, sellingPrice: 1380, stock: 450, availableStock: 430, reservedStock: 20, status: 'Approved', imageUrl: 'https://picsum.photos/200', moq: 10, dispatchTime: '24h', wholesalerId: 'WHL-001', visibility: 'Public' },
    { id: 'PRD-105', name: 'Silk Saree Banarast', sku: 'BPR-APP-998212-1023', category: 'Ladies Textile', basePrice: 3500, margin: 15, sellingPrice: 4025, stock: 50, availableStock: 50, reservedStock: 0, status: 'Pending Approval', imageUrl: 'https://picsum.photos/203', moq: 5, dispatchTime: '48h', wholesalerId: 'WHL-001', visibility: 'Public' },
    { id: 'PRD-106', name: 'Men\'s Formal Shirt', sku: 'BPR-APP-112321-1023', category: 'Gents Textile', basePrice: 800, margin: 15, sellingPrice: 920, stock: 200, availableStock: 200, reservedStock: 0, status: 'Draft', imageUrl: 'https://picsum.photos/204', moq: 20, dispatchTime: '24h', wholesalerId: 'WHL-001', visibility: 'Private' },
    { id: 'PRD-107', name: 'Winter Jacket', sku: 'BPR-APP-552123-1023', category: 'Gents Textile', basePrice: 2200, margin: 15, sellingPrice: 2530, stock: 0, availableStock: 0, reservedStock: 0, status: 'Rejected', imageUrl: 'https://picsum.photos/205', moq: 5, dispatchTime: '72h', rejectionReason: 'Image quality low', wholesalerId: 'WHL-001', visibility: 'Private' },
];

export const WHOLESALER_ORDERS: Order[] = [
    { id: 'ORD-9001', retailerId: 'RET-8821', retailerName: 'Retailer #8821', wholesalerName: 'Me', amount: 15000, baseCost: 12750, margin: 2250, status: 'Pending Supplier Response', date: '2023-10-27 09:30', deadline: '2h 15m', items: '10x Cotton Panjabi', dispatchBy: '2023-10-29' },
    { id: 'ORD-9002', retailerId: 'RET-4432', retailerName: 'Retailer #4432', wholesalerName: 'Me', amount: 8500, baseCost: 7225, margin: 1275, status: 'Supplier Accepted', date: '2023-10-26 14:20', items: '20x Formal Shirt', dispatchBy: '2023-10-28' },
    { id: 'ORD-9003', retailerId: 'RET-1129', retailerName: 'Retailer #1129', wholesalerName: 'Me', amount: 42000, baseCost: 35700, margin: 6300, status: 'Dispatched', date: '2023-10-25', items: '50x Silk Saree' },
];

export const WHOLESALER_PAYMENTS: PaymentRecord[] = [
    { id: 'PAY-101', orderId: 'ORD-7829', amount: 45000, commission: 2250, netPayable: 42750, status: 'Settled', date: '2023-10-25 14:30', wholesalerId: 'WHL-001' },
    { id: 'PAY-102', orderId: 'ORD-7830', amount: 12500, commission: 625, netPayable: 11875, status: 'Settled', date: '2023-10-26 10:15', wholesalerId: 'WHL-002' },
    { id: 'PAY-103', orderId: 'ORD-9001', amount: 15000, commission: 750, netPayable: 14250, status: 'Pending', date: '2023-10-27 09:45', wholesalerId: 'WHL-001' },
];

// Retailer Data - Reusing MOCK_PRODUCTS for catalog but adding Retailer-specific fields

export const RETAILER_PRODUCTS: Product[] = MOCK_PRODUCTS.map(p => ({
    ...p,
    estimatedProfit: Math.round(p.sellingPrice * 0.25) // Approx 25% retail margin
}));

export const RETAILER_WALLET_HISTORY: WalletTransaction[] = [
    { id: 'TXN-001', type: 'Payment', amount: 15000, date: '2023-10-25', description: 'Order #ORD-9001 Partial Payment' },
    { id: 'TXN-002', type: 'Payment', amount: 8500, date: '2023-10-20', description: 'Order #ORD-8822 Full Payment' },
    { id: 'TXN-003', type: 'Refund', amount: 2000, date: '2023-10-18', description: 'Refund for missing items #ORD-8701' },
];

export const MOCK_EXPENSES = [
    { id: 'EXP-001', category: 'Marketing', amount: 5000, date: '2023-10-20', description: 'Facebook Ads Campaign', status: 'Paid', paymentMethod: 'Bank' },
    { id: 'EXP-002', category: 'Logistics', amount: 12000, date: '2023-10-22', description: 'Steadfast Courier Pre-payment', status: 'Paid', paymentMethod: 'Bank' },
    { id: 'EXP-003', category: 'Software', amount: 2500, date: '2023-10-25', description: 'Server Costs', status: 'Pending', paymentMethod: 'Mobile Money' },
    { id: 'EXP-004', category: 'Office', amount: 1500, date: '2023-10-28', description: 'Stationery', status: 'Paid', paymentMethod: 'Cash' },
    { id: 'EXP-005', category: 'Salary', amount: 45000, date: '2023-10-30', description: 'Staff Salaries', status: 'Pending', paymentMethod: 'Bank' },
];

export const MOCK_MANUFACTURING_ORDERS: ManufacturingOrder[] = [
    {
        id: 'MFG-1001',
        retailerId: 'RET-001',
        retailerName: 'Mayer Doa Store',
        retailerImage: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
        brandName: 'Mayer Doa Fashion',
        productCategory: 'Men\'s Polo',
        productImage: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&q=80',
        quantity: 500,
        targetPricePerUnit: 350,
        specifications: '100% Cotton, 220 GSM, Embroidery Logo on chest',
        status: 'Production',
        requestDate: '2023-10-15',
        deliveryDate: '2023-11-15',
        updates: [
            { date: '2023-10-15', status: 'Requested', note: 'Order placed' },
            { date: '2023-10-16', status: 'Quotation Sent', note: 'Price agreed at 350 BDT' },
            { date: '2023-10-18', status: 'Production', note: 'Fabric sourcing started' }
        ]
    },
    {
        id: 'MFG-1002',
        retailerId: 'RET-002',
        retailerName: 'Bhai Bhai Traders',
        retailerImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        brandName: 'BBT Gear',
        productCategory: 'Denim Jeans',
        productImage: 'https://images.unsplash.com/photo-1542272617-08f08630329e?w=500&q=80',
        quantity: 200,
        targetPricePerUnit: 650,
        specifications: 'Slim Fit, Stone Wash, YKK Zipper',
        status: 'Requested',
        requestDate: '2023-10-28',
        updates: [
            { date: '2023-10-28', status: 'Requested', note: 'Waiting for quotation' }
        ]
    }
];

export const MOCK_MANUFACTURING_SAMPLES: ManufacturingSample[] = [
    {
        id: 'SMP-001',
        name: 'Premium Cotton T-Shirt',
        category: 'Apparel',
        price: 450,
        moq: 100,
        description: 'High-quality 100% cotton t-shirt suitable for custom printing.',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        specifications: ['180 GSM', 'Combed Cotton', 'Bio-washed']
    },
    {
        id: 'SMP-002',
        name: 'Slim Fit Denim Jeans',
        category: 'Apparel',
        price: 850,
        moq: 50,
        description: 'Classic slim fit denim jeans with durable stitching.',
        image: 'https://images.unsplash.com/photo-1542272617-08f08630329e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        specifications: ['12oz Denim', 'YKK Zippers', 'Stretchable']
    },
    {
        id: 'SMP-003',
        name: 'Canvas Tote Bag',
        category: 'Accessories',
        price: 150,
        moq: 200,
        description: 'Eco-friendly canvas tote bag for retail branding.',
        image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        specifications: ['100% Cotton Canvas', 'Reinforced Handles', '35x40cm']
    }
];

export const MOCK_REWARD_SETTINGS: RewardSettings = {
    earningRate: 100, // 1 point per 100 BDT
    minRedeemPoints: 500,
    expiryDurationDays: 365
};

export const BANGLADESH_DISTRICTS = [
    'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail',
    'Bagerhat', 'Chuadanga', 'Jessore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira',
    'Bogra', 'Joypurhat', 'Naogaon', 'Natore', 'Chapai Nawabganj', 'Pabna', 'Rajshahi', 'Sirajganj',
    'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon',
    'Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet',
    'Barguna', 'Barisal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur',
    'Bandarban', 'Brahmanbaria', 'Chandpur', 'Chittagong', 'Comilla', "Cox's Bazar", 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati',
    'Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'
];

export const MOCK_SHIPPING_RATES: ShippingRate[] = [
    { id: 'SR-001', district: 'Dhaka', weight: 1, volume: 1000, price: 60 },
    { id: 'SR-002', district: 'Chittagong', weight: 1, volume: 1000, price: 120 },
    { id: 'SR-003', district: 'Sylhet', weight: 1, volume: 1000, price: 120 },
    { id: 'SR-004', district: 'Rajshahi', weight: 1, volume: 1000, price: 120 },
    { id: 'SR-005', district: 'Khulna', weight: 1, volume: 1000, price: 120 },
];

export const MOCK_REWARDS: RewardItem[] = [
    {
        id: 'REW-001',
        title: '500 BDT Discount Coupon',
        description: 'Get a flat 500 BDT discount on your next order.',
        pointsCost: 500,
        type: 'Discount',
        value: 500,
        status: 'Active'
    },
    {
        id: 'REW-002',
        title: 'Premium T-Shirt Gift',
        description: 'Redeem for a free premium quality t-shirt.',
        pointsCost: 1000,
        type: 'Gift',
        status: 'Active'
    },
    {
        id: 'REW-003',
        title: '1000 BDT Wallet Cashback',
        description: 'Add 1000 BDT directly to your wallet balance.',
        pointsCost: 1200,
        type: 'Cashback',
        value: 1000,
        status: 'Active'
    }
];

export const MOCK_RETAILER_REWARDS_PROFILE: RetailerRewardsProfile = {
    retailerId: 'RET-001',
    totalPointsEarned: 1250,
    totalPointsRedeemed: 500,
    currentBalance: 750,
    transactions: [
        {
            id: 'TXN-PT-001',
            retailerId: 'RET-001',
            type: 'Earned',
            amount: 150,
            date: '2023-10-15',
            orderId: 'ORD-9821',
            description: 'Order Reward',
            balanceAfter: 150
        },
        {
            id: 'TXN-PT-002',
            retailerId: 'RET-001',
            type: 'Earned',
            amount: 600,
            date: '2023-10-20',
            orderId: 'ORD-9932',
            description: 'Order Reward',
            balanceAfter: 750
        },
        {
            id: 'TXN-PT-003',
            retailerId: 'RET-001',
            type: 'Redeemed',
            amount: -500,
            date: '2023-10-25',
            description: 'Redeemed: 500 BDT Coupon',
            balanceAfter: 250,
            status: 'Redeemed'
        },
        {
            id: 'TXN-PT-004',
            retailerId: 'RET-001',
            type: 'Earned',
            amount: 500,
            date: '2023-11-01',
            orderId: 'ORD-10234',
            description: 'Order Reward',
            balanceAfter: 750
        }
    ]
};