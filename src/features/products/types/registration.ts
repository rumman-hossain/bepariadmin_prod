/** Product registration types — aligned with mobile + backend CreateProductRequest */

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface MediaSlot {
  localUri: string;
  uploadedUrl: string;
  uploadStatus: UploadStatus;
  uploadError?: string;
}

export interface ProductMediaState {
  poster: MediaSlot;
  front: MediaSlot;
  back: MediaSlot;
  left: MediaSlot;
  right: MediaSlot;
  more: MediaSlot[];
  video: MediaSlot & { thumbnail: string };
}

export interface VariationMediaState {
  front: MediaSlot;
  back: MediaSlot;
  more: MediaSlot[];
  video: MediaSlot & { thumbnail: string };
}

export interface ProductInventoryItem {
  size: string;
  stock: number;
  moq: number;
  lowStockAlert: number;
}

export interface ProductMediaItem {
  url: string;
  mediaType: 'image' | 'video';
  position: number;
}

export interface ProductVariation {
  id: string;
  productId?: string;
  color?: string;
  design?: string;
  subName?: string;
  subSku?: string;
  displayLabel?: string;
  seq?: number;
  stock?: number;
  moq?: number;
  lowStockAlert?: number;
  price?: number;
  inventory?: ProductInventoryItem[];
  media?: VariationMediaState | ProductMediaItem[];
  videoUrl?: string;
  sizeStock?: Record<string, string>;
  sizeMoq?: Record<string, string>;
  sizeAlert?: Record<string, string>;
  stockedOutSizes?: string[];
}

export interface SizeConfig {
  type: string;
  profile?: string;
  options?: string[];
  range?: { start: number; end: number; step?: number };
  scales?: string[];
  units?: string[];
  sizes?: string[];
}

export interface CatalogNode {
  id: string;
  name: string;
  code?: string;
  categoryId?: string;
  subCategoryId?: string;
  productGroupId?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  brandName?: string;
  unitType?: string;
  category?: string;
  categoryId?: string;
  subCategory?: string;
  subCategoryId?: string;
  productGroup?: string;
  productGroupId?: string;
  classificationId?: string;
  productDetailId?: string;
  sku: string;
  basePrice: number;
  margin?: number;
  sellingPrice?: number;
  platformPrice?: number;
  moq: number;
  moqSet?: Record<string, string>;
  stock?: number;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  dispatchTime?: string;
  visibility?: string;
  wholesalerId?: string;
  hasVariant?: boolean;
  variationColors?: string[];
  variationDesigns?: string[];
  sizeType?: string;
  material?: string;
  weight?: number;
  volume?: number;
  availableSizes?: string[];
  productTags?: string[];
  media?: ProductMediaItem[];
  inventory?: ProductInventoryItem[];
  variations?: Array<Record<string, unknown>>;
}

export type UpdateProductInput = Partial<CreateProductInput> & { status?: string };

export interface WizardState {
  name: string;
  brandName: string;
  unitType: string;
  category: string;
  categoryId: string;
  subCategory: string;
  subCategoryId: string;
  productGroup: string;
  productGroupId: string;
  productTemplateId: string;
  productClassification: string;
  classificationId: string;
  productDetailId: string;
  description: string;
  material: string;
  weight: string;
  volume: string;
  colors: string;
  selectedSizes: string[];
  tags: string[];
  basePrice: string;
  margin: string;
  stock: string;
  lowStockAlert: string;
  moq: string;
  dispatchTime: string;
  hasVariant: boolean | null;
  moqSet: Record<string, string>;
  sizeStockSet: Record<string, string>;
  sizeLowStockAlertSet: Record<string, string>;
  variationColors: string[];
  variationDesigns: string[];
  variations: ProductVariation[];
  productMedia: ProductMediaState;
  warrantyEnabled: boolean;
  warrantyDuration: string;
  warrantyDescription: string;
  returnPolicyEnabled: boolean;
  returnWindow: string;
  returnCondition: string;
  exchangeEnabled: boolean;
  exchangeWindow: string;
  exchangeDescription: string;
  productId: number | null;
  draftId: string | null;
  sku: string;
  classificationDetails: unknown[];
  sizeMode: 'LETTER' | 'NUMBER' | 'UNIQUE' | 'AUTO';
  sizeType: string;
  fwScale: 'UK' | 'EU' | 'US';
  errors: string[];
  stockedOutSizes: string[];
  generalStockedOut: boolean;
  /** Admin: selected wholesaler */
  wholesalerId: string;
  wholesalerCode: string;
}
