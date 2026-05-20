import { Product, OrderStatus } from '../types';

/**
 * 2️⃣ PRICING ENGINE (AUTOMATED)
 * Formula: Final Price = Base Price + (Base Price × Category Margin %)
 */
const MARGIN_RULES: Record<string, number> = {
    'Garments': 0.15, // 15%
    'Cosmetics': 0.20,
    'Bags': 0.18,
    'Footwear': 0.12,
    'Ornaments': 0.25,
    'Electronics': 0.10,
    'default': 0.15
};

export const PricingEngine = {
    calculateSellingPrice: (basePrice: number, category: string, customCommissionRate?: number): number => {
        const margin = customCommissionRate !== undefined ? customCommissionRate / 100 : (MARGIN_RULES[category] || MARGIN_RULES['default']);
        return Math.round(basePrice + (basePrice * margin));
    },
    getMarginPercent: (category: string, customCommissionRate?: number): number => {
        return customCommissionRate !== undefined ? customCommissionRate : (MARGIN_RULES[category] || MARGIN_RULES['default']) * 100;
    }
};

/**
 * 7️⃣ SKU GENERATION ENGINE
 * Format: BPR-[CategoryCode]-[Random6Digit]-[MonthYear]
 */
export const SKUGenerator = {
    generate: (
        wholesalerId: string, 
        categoryCode: string, 
        subCategoryCode: string, 
        productGroupCode: string, 
        sequence: string, 
        colorCode?: string, 
        designCode?: string
    ): string => {
        const parts = [
            wholesalerId,
            categoryCode,
            subCategoryCode,
            productGroupCode,
            sequence
        ];
        
        if (colorCode) parts.push(colorCode);
        if (designCode) parts.push(designCode);

        return parts.join('-');
    }
};

/**
 * 3️⃣ INVENTORY ENGINE
 */
export const InventoryEngine = {
    // Stock locked temporarily when order placed
    reserveStock: (product: Product, quantity: number): Product => {
        if ((product.availableStock || product.stock) < quantity) {
            throw new Error("Insufficient Stock");
        }
        return {
            ...product,
            availableStock: (product.availableStock || product.stock) - quantity,
            reservedStock: (product.reservedStock || 0) + quantity
        };
    },
    // Stock reduces only after order reaches "Confirmed" state
    commitStock: (product: Product, quantity: number): Product => {
        return {
            ...product,
            stock: product.stock - quantity,
            reservedStock: (product.reservedStock || 0) - quantity
        };
    },
    // Auto release stock if order rejected or payment fails
    releaseStock: (product: Product, quantity: number): Product => {
        return {
            ...product,
            availableStock: (product.availableStock || 0) + quantity,
            reservedStock: (product.reservedStock || 0) - quantity
        };
    }
};

/**
 * 4️⃣ ORDER WORKFLOW ENGINE
 */
export const OrderWorkflow = {
    nextStatus: (currentStatus: OrderStatus): OrderStatus[] => {
        switch (currentStatus) {
            case 'Created': return ['Pending Supplier Response', 'Cancelled'];
            case 'Pending Supplier Response': return ['Supplier Accepted', 'Rejected', 'Auto-Reassigned'];
            case 'Supplier Accepted': return ['Awaiting Partial Payment', 'Cancelled'];
            case 'Awaiting Partial Payment': return ['Payment Verified', 'Cancelled'];
            case 'Payment Verified': return ['Confirmed'];
            case 'Confirmed': return ['Label Generated'];
            case 'Label Generated': return ['Parcel is Ready'];
            case 'Parcel is Ready': return ['Dispatched'];
            case 'Dispatched': return ['Delivered'];
            case 'Delivered': return ['Settled'];
            default: return [];
        }
    },
    
    // Visibility Check
    canViewStatus: (status: OrderStatus, role: string): boolean => {
        if (role === 'Retailer' && status === 'Auto-Reassigned') return false; // Hide internal routing from retailer
        return true;
    }
};
