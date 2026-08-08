/** Product registration types — aligned with mobile + backend CreateProductRequest */

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface MediaSlot {
  localUri: string;
  uploadedUrl: string;
  uploadStatus: UploadStatus;
  uploadError?: string;
  /**
   * A stable identity for a "more"-gallery slot, so background upload progress
   * lands on the right one.
   *
   * The named slots — poster, front, back, video — are addressed
   * by key and need none. The gallery is an ARRAY, and an index is not an
   * identity: remove slot 1 while slot 2 is still uploading and the in-flight
   * progress for the old index 2 arrives at what is now a different image.
   *
   * Never reused, including after a delete. Ported from the mobile app, where
   * this is `galleryKey` on the same type.
   */
  galleryKey?: string;
  /**
   * The GCS object this slot's bytes landed in.
   *
   * Kept so the slot has an identity independent of any URL — the URL format is
   * the server's business and has already been wrong once (a signed PUT URL was
   * being stored as the product's image). Not sent in the payload today.
   */
  objectName?: string;
}

export interface ProductMediaState {
  poster: MediaSlot;
  front: MediaSlot;
  back: MediaSlot;
  /*
   * `left` and `right` are GONE.
   *
   * Two fixed side-shot slots that a wholesale catalogue does not need — a
   * shirt has a front, a back and a few detail shots, not six orthographic
   * views. They are folded into `more` on hydrate so no existing product loses
   * an image, and the gallery is capped at three.
   */
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
  /**
   * What the SUPPLIER costed this colour at, and the only price the wizard
   * edits. `basePrice` is the same fact under the name the server uses;
   * productVariationSchema keeps them in step.
   */
  price?: number;
  basePrice?: number;
  /**
   * Cost plus the supplier's platform margin, derived by the server. READ-ONLY
   * — nothing in the wizard may write it, and it must never be folded back into
   * `price`, which is what made an edit reload the margined figure as the cost
   * and compound the margin on every save.
   */
  sellingPrice?: number;
  inventory?: ProductInventoryItem[];
  media?: VariationMediaState | ProductMediaItem[];
  videoUrl?: string;
  sizeStock?: Record<string, string>;
  sizeMoq?: Record<string, string>;
  sizeAlert?: Record<string, string>;
  /*
   * REMOVED — the per-variation stocked-out list.
   *
   * Nothing ever wrote it. The only control, the In/Out toggle in the stock
   * grid, writes the PRODUCT-level `stockedOutSizes`, and `isVariationStocked`
   * used to read this one — so marking a size Out disabled its cells while the
   * validator kept demanding values for them. There is one list now, on
   * WizardState. Re-adding this field means adding a control for it first.
   */
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

  /**
   * True once the user has ADDED or DELETED media this session.
   *
   * Ported from the mobile app, which added it because a per-slot delete never
   * touches `draftId`: `hasNewMedia` alone cannot detect one, so an edit that
   * removed a required image and submitted would silently save an incomplete
   * product. The admin console had no equivalent and the same defect.
   *
   * Set ONLY by genuine user add/delete. Background progress-sync — an upload
   * advancing its status or url — must never set it, or every product becomes
   * dirty just by watching its own uploads finish. The discriminator is
   * `'localUri' in slot`: user actions always carry one (a path on pick, `''`
   * on clear), progress updates never do.
   *
   * Reset by `reset()` and `hydrate()`: a freshly loaded product starts clean
   * regardless of what the previous one did.
   */
  mediaDirty: boolean;
}
