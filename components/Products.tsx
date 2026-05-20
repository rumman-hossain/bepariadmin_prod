import React, { useState, useRef } from 'react';
import { Card } from './ui/Card';
import { Edit2, Eye, Check, X, Tag, ArrowLeft, Save, Download, FileText, Scale, Sparkles, Wand2, RefreshCw, Plus, Trash2, Image as ImageIcon, Star, Bot, Store, Clock, Filter, ListFilter, Upload, FileSpreadsheet, XCircle, AlertCircle, Box, Palette, Package } from 'lucide-react';
import { PricingEngine, SKUGenerator } from '../services/coreEngine';
import { CATEGORY_STRUCTURE, getCategoryByName, getSubCategoryByName, getProductGroupByName } from '../services/categories';
import { Product, ProductVariation } from '../src/types/domain';
import { editProductImage, enhanceProductDetails } from '../services/geminiService';
import { MOCK_WHOLESALERS } from '../services/mockData';

interface ProductsProps {
    products?: Product[];
    wholesalers?: Wholesaler[];
    onUpdateProduct?: (product: Product) => void;
    onAddProduct?: (product: Product) => void;
}

export const Products: React.FC<ProductsProps> = ({ products = [], wholesalers = [], onUpdateProduct, onAddProduct }) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Filter State
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSubCategory, setFilterSubCategory] = useState('All');
  const [filterProductGroup, setFilterProductGroup] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editBrandName, setEditBrandName] = useState('');
  const [editUnitType, setEditUnitType] = useState('piece');
  const [editCategory, setEditCategory] = useState('Gents Textile');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [editProductGroup, setEditProductGroup] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaterial, setEditMaterial] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editVolume, setEditVolume] = useState('');
  const [editAvailableSizes, setEditAvailableSizes] = useState<string[]>(['Unique Size']);
  const [editMoqSet, setEditMoqSet] = useState<Record<string, number>>({});
  
  // Inventory & Pricing State
  const [editStock, setEditStock] = useState(0);
  const [editMoq, setEditMoq] = useState(1);
  const [editDispatchTime, setEditDispatchTime] = useState('24h');
  const [editBasePrice, setEditBasePrice] = useState(0);
  const [editSellingPrice, setEditSellingPrice] = useState(0);
  const [editDiscountPercentage, setEditDiscountPercentage] = useState(0);
  const [editIsSponsored, setEditIsSponsored] = useState(false);
  const [editSponsoredUntil, setEditSponsoredUntil] = useState('');
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editFeaturedUntil, setEditFeaturedUntil] = useState('');
  
  // Image Management
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Media & Variations
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editVariations, setEditVariations] = useState<ProductVariation[]>([]);
  const [variationColors, setVariationColors] = useState('');
  const [variationDesigns, setVariationDesigns] = useState('');
  const [editBundleDescription, setEditBundleDescription] = useState('');

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEnhancingDetails, setIsEnhancingDetails] = useState(false);
  const [aiLanguage, setAiLanguage] = useState<'English' | 'Bangla'>('English');

  const openEditModal = (product: Product, adding: boolean = false) => {
      setEditingProduct(product);
      setIsAdding(adding);
      setEditName(product.name);
      setEditBrandName(product.brandName || '');
      setEditUnitType(product.unitType || 'piece');
      setEditCategory(product.category || 'Gents Textile');
      setEditSubCategory(product.subCategory || '');
      setEditProductGroup(product.productGroup || '');
      setEditDescription(product.description || '');
      setEditMaterial(product.material || '');
      setEditColor(product.color || '');
      setEditWeight(product.weight || '');
      setEditVolume(product.volume || '');
      setEditAvailableSizes(product.availableSizes || ['Unique Size']);
      setEditMoqSet(product.moqSet || {});
      
      setEditStock(product.stock || 0);
      setEditMoq(product.moq || 1);
      setEditDispatchTime(product.dispatchTime || '24h');
      
      setEditBasePrice(product.basePrice);
      setEditSellingPrice(product.sellingPrice);
      setEditDiscountPercentage(product.discountPercentage || 0);
      setEditIsSponsored(product.isSponsored || false);
      setEditSponsoredUntil(product.sponsoredUntil || '');
      setEditIsFeatured(product.isFeatured || false);
      setEditFeaturedUntil(product.featuredUntil || '');
      
      setEditVideoUrl(product.videoUrl || '');
      setEditVariations(product.variations || []);
      setEditBundleDescription(product.bundleDetails?.description || '');
      
      setAiPrompt(''); // Reset AI prompt
      setAiLanguage('English'); // Reset language
      
      // Initialize Images
      const existingUrls = product.imageUrls && product.imageUrls.length > 0 
          ? product.imageUrls 
          : product.imageUrl ? [product.imageUrl] : [];
      
      // Deduplicate just in case
      const uniqueUrls = Array.from(new Set(existingUrls));
      setEditImageUrls(uniqueUrls);
      setSelectedImageIndex(0);

      // Generate SKU if adding new product and none exists
      if (adding && !product.sku) {
          const cat = getCategoryByName(product.category || 'Gents Textile');
          const subCat = cat?.subCategories[0];
          const group = subCat?.productGroups[0];
          
          setEditCategory(cat?.name || 'Gents Textile');
          setEditSubCategory(subCat?.name || '');
          setEditProductGroup(group?.name || '');

          const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
          setEditSku(SKUGenerator.generate(
              product.wholesalerId || 'ADMIN',
              cat?.code || 'GT',
              subCat?.code || 'TS',
              group?.code || 'TS',
              sequence
          ));
      } else {
          setEditSku(product.sku || '');
      }
  };

  // Derived Data for Filters
  const uniqueCategories = CATEGORY_STRUCTURE.map(c => c.name);
  const uniqueSubCategories = filterCategory === 'All' ? [] : CATEGORY_STRUCTURE.find(c => c.name === filterCategory)?.subCategories.map(s => s.name) || [];
  const uniqueProductGroups = filterSubCategory === 'All' ? [] : CATEGORY_STRUCTURE.find(c => c.name === filterCategory)?.subCategories.find(s => s.name === filterSubCategory)?.productGroups.map(g => g.name) || [];
  const uniqueWholesalerIds = Array.from(new Set(products.map(p => p.wholesalerId)));

  const filteredProducts = [...products]
    .filter(p => filterSupplier === 'All' || p.wholesalerId === filterSupplier)
    .filter(p => filterCategory === 'All' || p.category === filterCategory)
    .filter(p => filterSubCategory === 'All' || p.subCategory === filterSubCategory)
    .filter(p => filterProductGroup === 'All' || p.productGroup === filterProductGroup)
    .filter(p => filterStatus === 'All' || p.status === filterStatus)
    .sort((a, b) => {
        if (sortOrder === 'newest') {
            // If createdAt exists, sort by it, otherwise assume higher ID is newer or maintain order
            if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            return b.id.localeCompare(a.id); 
        } else {
             if (a.createdAt && b.createdAt) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
             return a.id.localeCompare(b.id);
        }
    });

  const handleInitAdd = () => {
    const newPrd: Product = {
        id: `PRD-${Date.now()}`,
        name: '',
        brandName: '',
        unitType: 'piece',
        sku: '', // Will be generated in useEffect
        category: 'Gents Textile',
        basePrice: 0,
        margin: 0,
        sellingPrice: 0,
        stock: 0,
        availableStock: 0,
        moq: 1,
        dispatchTime: '24h',
        wholesalerId: 'ADMIN', 
        status: 'Draft',
        imageUrl: '',
        imageUrls: [],
        visibility: 'Public',
        createdAt: new Date().toISOString()
    };
    openEditModal(newPrd, true);
  };

  // Handle simple approval (direct click)
  const handleApprove = (product: Product) => {
      if (onUpdateProduct) {
          onUpdateProduct({ ...product, status: 'Approved' });
      }
  };

  const handleReject = (product: Product) => {
      if (onUpdateProduct) {
          onUpdateProduct({ ...product, status: 'Rejected', rejectionReason: 'Admin rejected manually' });
      }
  };

  const handleSaveEdit = () => {
      if (editingProduct) {
          // Validation
          if (!editName) { alert("Product name is required"); return; }
          if (editImageUrls.length === 0) { alert("At least one image is required"); return; }
          if (editBasePrice <= 0) { alert("Base price must be greater than 0"); return; }

          const mainImage = editImageUrls[0];
          
          const finalProduct: Product = {
              ...editingProduct,
              name: editName,
              brandName: editBrandName,
              unitType: editUnitType,
              category: editCategory,
              subCategory: editSubCategory,
              productGroup: editProductGroup,
              sku: editSku,
              description: editDescription,
              material: editMaterial,
              color: editColor,
              weight: editWeight,
              volume: editVolume,
              availableSizes: editAvailableSizes,
              moqSet: editAvailableSizes.includes('Unique Size') ? undefined : editMoqSet,
              
              stock: editStock,
              availableStock: editStock, // Admin reset
              moq: editAvailableSizes.includes('Unique Size') ? editMoq : Object.values(editMoqSet).reduce((sum, val) => sum + (val || 0), 0),
              dispatchTime: editDispatchTime,
              
              basePrice: editBasePrice,
              sellingPrice: editSellingPrice,
              discountPercentage: editDiscountPercentage,
              isSponsored: editIsSponsored,
              sponsoredUntil: editSponsoredUntil,
              isFeatured: editIsFeatured,
              featuredUntil: editFeaturedUntil,
              imageUrl: mainImage,
              imageUrls: editImageUrls,
              videoUrl: editVideoUrl,
              variations: editVariations.length > 0 ? editVariations : undefined,
              bundleDetails: {
                  isBundle: editBundleDescription.trim() !== '',
                  description: editBundleDescription
              },
              status: 'Approved', // Auto approve on save
              updatedAt: new Date().toISOString()
          };

          if (isAdding && onAddProduct) {
             onAddProduct(finalProduct);
          } else if (onUpdateProduct) {
             onUpdateProduct(finalProduct);
          }

          setEditingProduct(null);
          setIsAdding(false);
      }
  };

  const handleModalReject = () => {
      if (editingProduct) {
          const finalProduct: Product = {
              ...editingProduct,
              name: editName,
              brandName: editBrandName,
              unitType: editUnitType,
              category: editCategory,
              subCategory: editSubCategory,
              productGroup: editProductGroup,
              sku: editSku,
              description: editDescription,
              material: editMaterial,
              color: editColor,
              weight: editWeight,
              volume: editVolume,
              availableSizes: editAvailableSizes,
              moqSet: editAvailableSizes.includes('Unique Size') ? undefined : editMoqSet,
              stock: editStock,
              availableStock: editStock,
              moq: editAvailableSizes.includes('Unique Size') ? editMoq : Object.values(editMoqSet).reduce((sum, val) => sum + (val || 0), 0),
              dispatchTime: editDispatchTime,
              basePrice: editBasePrice,
              sellingPrice: editSellingPrice,
              imageUrl: editImageUrls[0] || editingProduct.imageUrl,
              imageUrls: editImageUrls,
              videoUrl: editVideoUrl,
              variations: editVariations.length > 0 ? editVariations : undefined,
              bundleDetails: {
                  isBundle: editBundleDescription.trim() !== '',
                  description: editBundleDescription
              },
              status: 'Rejected',
              rejectionReason: 'Rejected by Admin',
              updatedAt: new Date().toISOString()
          };

          if (onUpdateProduct) {
             onUpdateProduct(finalProduct);
          }
          setEditingProduct(null);
          setIsAdding(false);
      }
  };

  // CSV Bulk Upload Logic
  const handleDownloadSampleCsv = () => {
    const headers = "Name,Category,Description,Material,Weight,Volume,BasePrice,Stock,MOQ,DispatchTime,ImageUrl";
    const sampleRow = "Premium Cotton Panjabi,Garments,High quality cotton panjabi for festivals,Cotton,250g,10x10x5cm,1200,50,10,24h,https://picsum.photos/300";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sampleRow;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "beparibd_product_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;

        const lines = text.split('\n');
        // Skip header (index 0)
        let successCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Simple CSV split (Note: does not handle commas inside quotes for simplicity)
            const cols = line.split(',');
            
            // Expecting 11 columns based on sample
            if (cols.length < 5) continue; 

            const [name, category, description, material, weight, volume, basePrice, stock, moq, dispatchTime, imageUrl] = cols;
            
            const cleanCategory = category?.trim() || 'Gents Textile';
            const cleanBasePrice = parseFloat(basePrice) || 0;
            const cleanImageUrl = imageUrl?.trim() || 'https://picsum.photos/200';

            const newProduct: Product = {
                id: `PRD-${Date.now()}-${i}`,
                name: name?.trim() || 'Untitled Product',
                category: cleanCategory,
                description: description?.trim(),
                material: material?.trim(),
                weight: weight?.trim(),
                volume: volume?.trim(),
                basePrice: cleanBasePrice,
                stock: parseInt(stock) || 0,
                availableStock: parseInt(stock) || 0,
                moq: parseInt(moq) || 1,
                dispatchTime: dispatchTime?.trim() || '24h',
                imageUrl: cleanImageUrl,
                imageUrls: [cleanImageUrl],
                
                // Auto-generated
                sku: SKUGenerator.generate(cleanCategory),
                sellingPrice: PricingEngine.calculateSellingPrice(cleanBasePrice, cleanCategory),
                margin: PricingEngine.getMarginPercent(cleanCategory),
                status: 'Draft', // Bulk uploads go to Draft
                wholesalerId: 'ADMIN',
                visibility: 'Public',
                createdAt: new Date().toISOString()
            };

            if (onAddProduct) onAddProduct(newProduct);
            successCount++;
        }
        alert(`Successfully imported ${successCount} products as Drafts.`);
        if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  const url = event.target.result as string;
                  setEditImageUrls(prev => [...prev, url]);
                  if (editImageUrls.length === 0) setSelectedImageIndex(0);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setEditVideoUrl(URL.createObjectURL(file));
      }
  };

  const handleDownloadImage = (url: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `product-image-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Helper to get Base64 from URL
  const getBase64FromUrl = async (url: string): Promise<string | null> => {
      try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64data = reader.result?.toString().split(',')[1];
                  resolve(base64data || null);
              };
              reader.readAsDataURL(blob);
          });
      } catch (e) {
          console.error("Error fetching image:", e);
          return null;
      }
  };

  const handleNanoBananaEdit = async () => {
      if (!aiPrompt || editImageUrls.length === 0) return;
      setIsGeneratingImage(true);
      
      const sourceImage = editImageUrls[selectedImageIndex];
      const base64data = await getBase64FromUrl(sourceImage);

      if (base64data) {
          const newImageBase64 = await editProductImage(base64data, aiPrompt);
          if (newImageBase64) {
              const newImageUrl = `data:image/png;base64,${newImageBase64}`;
              setEditImageUrls(prev => [...prev, newImageUrl]);
              setSelectedImageIndex(editImageUrls.length); // Select the new image (length before update is index of new item)
          } else {
              alert("Nano Banana could not edit the image. Check console or API key.");
          }
      } else {
           alert("Failed to process source image.");
      }
      setIsGeneratingImage(false);
  };

  const handleVariationNanoBananaEdit = async (index: number) => {
      const variation = editVariations[index];
      if (!variation.photoUrl || !aiPrompt) return;
      
      setIsGeneratingImage(true);
      const base64data = await getBase64FromUrl(variation.photoUrl);

      if (base64data) {
          const newImageBase64 = await editProductImage(base64data, aiPrompt);
          if (newImageBase64) {
              const newImageUrl = `data:image/png;base64,${newImageBase64}`;
              const updated = [...editVariations];
              updated[index].photoUrl = newImageUrl;
              setEditVariations(updated);
          } else {
              alert("Nano Banana could not edit the variation image. Check console or API key.");
          }
      } else {
           alert("Failed to process source image.");
      }
      setIsGeneratingImage(false);
  };

  const generateVariations = () => {
      const colors = variationColors.split(',').map(c => c.trim()).filter(Boolean);
      const designs = variationDesigns.split(',').map(d => d.trim()).filter(Boolean);
      
      const newVariations: ProductVariation[] = [];
      
      if (colors.length === 0 && designs.length === 0) return;

      if (colors.length > 0 && designs.length > 0) {
          colors.forEach(color => {
              designs.forEach(design => {
                  const subName = `${editName}-${color}-${design}`;
                  newVariations.push({
                      id: `VAR-${Math.floor(Math.random() * 100000)}`,
                      color,
                      design,
                      subName,
                      subSku: `${editSku}-${color.substring(0,2).toUpperCase()}-${design.substring(0,2).toUpperCase()}`,
                      stock: 0,
                      price: editSellingPrice
                  });
              });
          });
      } else if (colors.length > 0) {
          colors.forEach(color => {
              const subName = `${editName}-${color}`;
              newVariations.push({
                  id: `VAR-${Math.floor(Math.random() * 100000)}`,
                  color,
                  subName,
                  subSku: `${editSku}-${color.substring(0,2).toUpperCase()}`,
                  stock: 0,
                  price: editSellingPrice
              });
          });
      } else if (designs.length > 0) {
          designs.forEach(design => {
              const subName = `${editName}-${design}`;
              newVariations.push({
                  id: `VAR-${Math.floor(Math.random() * 100000)}`,
                  design,
                  subName,
                  subSku: `${editSku}-${design.substring(0,2).toUpperCase()}`,
                  stock: 0,
                  price: editSellingPrice
              });
          });
      }
      
      setEditVariations(prev => [...prev, ...newVariations]);
  };

  const addManualVariation = () => {
      const newVariation: ProductVariation = {
          id: `VAR-${Math.floor(Math.random() * 100000)}`,
          color: '',
          design: '',
          subName: editName,
          subSku: editSku,
          stock: 0,
          price: editSellingPrice
      };
      setEditVariations(prev => [...prev, newVariation]);
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: string | number) => {
      setEditVariations(prev => {
          const updated = [...prev];
          const currentVar = updated[index];
          const nextVar = { ...currentVar, [field]: value };
          
          if (field === 'color' || field === 'design') {
              const color = field === 'color' ? value : currentVar.color;
              const design = field === 'design' ? value : currentVar.design;
              
              const nameParts = [editName];
              if (color && color.trim()) nameParts.push(color.trim());
              if (design && design.trim()) nameParts.push(design.trim());
              nextVar.subName = nameParts.join('-');
              
              const skuParts = [editSku];
              if (color && color.trim()) skuParts.push(color.trim().substring(0, 2).toUpperCase());
              if (design && design.trim()) skuParts.push(design.trim().substring(0, 2).toUpperCase());
              nextVar.subSku = skuParts.join('-');
          }
          
          updated[index] = nextVar;
          return updated;
      });
  };

  const removeVariation = (index: number) => {
      setEditVariations(prev => prev.filter((_, i) => i !== index));
  };

  const handleEnhanceDetails = async () => {
      if (!editingProduct) return;
      
      setIsEnhancingDetails(true);
      const sourceImage = editImageUrls[0] || editImageUrls[selectedImageIndex];
      const base64data = await getBase64FromUrl(sourceImage);

      if (base64data) {
          const enhanced = await enhanceProductDetails(
              editName, 
              editDescription, 
              editMaterial, 
              editCategory, // Use current form category 
              base64data,
              aiLanguage
          );

          if (enhanced) {
              setEditName(enhanced.name);
              setEditDescription(enhanced.description);
              setEditMaterial(enhanced.material);
          } else {
              alert("AI Enhancement failed. Please check connection.");
          }
      } else {
          alert("Could not load image for AI analysis.");
      }
      setIsEnhancingDetails(false);
  };

  const removeImage = (index: number) => {
      const newUrls = editImageUrls.filter((_, i) => i !== index);
      setEditImageUrls(newUrls);
      
      // Adjust selected index if needed
      if (index === selectedImageIndex) {
          setSelectedImageIndex(0); // Reset to first if deleted current
      } else if (index < selectedImageIndex) {
          setSelectedImageIndex(selectedImageIndex - 1); // Shift left if deleted previous
      }
  };

  const setAsMainImage = () => {
      if (selectedImageIndex === 0) return;
      
      const newUrls = [...editImageUrls];
      const selectedUrl = newUrls[selectedImageIndex];
      
      // Remove from current position
      newUrls.splice(selectedImageIndex, 1);
      // Add to start
      newUrls.unshift(selectedUrl);
      
      setEditImageUrls(newUrls);
      setSelectedImageIndex(0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-black">Product Moderation (Core Engine)</h1>
                <p className="text-slate-500 dark:text-slate-400">Approve, edit or reject wholesaler uploads. Automatic Margin & SKU active.</p>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={handleDownloadSampleCsv}
                    className="px-3 py-2 bg-slate-100 dark:bg-charcoal-900 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs font-bold flex items-center gap-1"
                    title="Download Template"
                 >
                    <Download className="w-4 h-4" /> Sample CSV
                 </button>
                 <button 
                     onClick={() => csvInputRef.current?.click()}
                     className="px-4 py-2 bg-white text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium flex items-center gap-2"
                 >
                     <FileSpreadsheet className="w-4 h-4" /> Bulk Upload CSV
                 </button>
                 <input 
                    type="file" 
                    ref={csvInputRef}
                    onChange={handleBulkUpload}
                    accept=".csv"
                    className="hidden"
                 />
                 <button 
                    onClick={handleInitAdd}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2 font-bold"
                >
                    <Plus className="w-4 h-4" /> Add Product
                 </button>
            </div>
        </div>

        {/* Filters & Controls */}
        <div className="flex flex-wrap items-center gap-3 py-2">
            <div className="flex items-center gap-2 bg-white border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Sort:</span>
                <select 
                    className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer border-none p-0 focus:ring-0"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                >
                    <option value="newest">Recently Added</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>

            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
                <Store className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Supplier:</span>
                <select 
                    className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer border-none p-0 focus:ring-0 max-w-[150px]"
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                >
                    <option value="All">All Suppliers</option>
                    {uniqueWholesalerIds.map(id => {
                        const name = MOCK_WHOLESALERS.find(w => w.id === id)?.companyName || id;
                        return <option key={id} value={id}>{name}</option>
                    })}
                </select>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
                <Tag className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Category:</span>
                <select 
                    className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer border-none p-0 focus:ring-0"
                    value={filterCategory}
                    onChange={(e) => {
                        setFilterCategory(e.target.value);
                        setFilterSubCategory('All');
                        setFilterProductGroup('All');
                    }}
                >
                    <option value="All">All Categories</option>
                    {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {filterCategory !== 'All' && uniqueSubCategories.length > 0 && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
                    <span className="text-xs text-slate-400 font-medium">Sub-Category:</span>
                    <select 
                        className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer border-none p-0 focus:ring-0"
                        value={filterSubCategory}
                        onChange={(e) => {
                            setFilterSubCategory(e.target.value);
                            setFilterProductGroup('All');
                        }}
                    >
                        <option value="All">All Sub-Categories</option>
                        {uniqueSubCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            )}

            {filterSubCategory !== 'All' && uniqueProductGroups.length > 0 && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
                    <span className="text-xs text-slate-400 font-medium">Group:</span>
                    <select 
                        className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer border-none p-0 focus:ring-0"
                        value={filterProductGroup}
                        onChange={(e) => setFilterProductGroup(e.target.value)}
                    >
                        <option value="All">All Groups</option>
                        {uniqueProductGroups.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="flex items-center gap-2 bg-white border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Status:</span>
                <select 
                    className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer border-none p-0 focus:ring-0"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="All">All Status</option>
                    <option value="Pending Approval">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Draft">Draft</option>
                    <option value="Suspended">Suspended</option>
                </select>
            </div>

            {(filterSupplier !== 'All' || filterCategory !== 'All' || filterSubCategory !== 'All' || filterProductGroup !== 'All' || filterStatus !== 'All') && (
                <button 
                    onClick={() => { setFilterSupplier('All'); setFilterCategory('All'); setFilterSubCategory('All'); setFilterProductGroup('All'); setFilterStatus('All'); }}
                    className="text-sm text-red-500 hover:text-red-600 font-bold px-2 py-1 flex items-center gap-1 bg-red-50 dark:bg-red-900/10 rounded-lg"
                >
                    <X className="w-3 h-3" /> Clear Filters
                </button>
            )}
            
             <div className="ml-auto text-xs font-medium text-slate-400">
                Showing {filteredProducts.length} of {products.length} products
            </div>
        </div>

        {/* List View Container */}
        <div className="space-y-4">
            {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                    <ListFilter className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-medium">No products match your filters</p>
                    <button 
                        onClick={() => { setFilterSupplier('All'); setFilterCategory('All'); setFilterSubCategory('All'); setFilterProductGroup('All'); setFilterStatus('All'); }}
                        className="mt-2 text-emerald-600 font-bold text-sm hover:underline"
                    >
                        Reset Filters
                    </button>
                </div>
            ) : (
                filteredProducts.map((product) => {
                    const wholesaler = wholesalers.find(w => w.id === product.wholesalerId) || MOCK_WHOLESALERS.find(w => w.id === product.wholesalerId);
                    const marginPercent = PricingEngine.getMarginPercent(product.category, wholesaler?.commissionRate);
                    const wholesalerName = wholesaler ? wholesaler.companyName : 'Unknown Supplier';

                    return (
                    <Card key={product.id} className="group flex flex-col md:flex-row gap-4 p-4 items-center md:items-start transition-all duration-300 hover:shadow-md border border-slate-100 dark:border-slate-800">
                        
                        {/* Image Section */}
                        <div className="w-full md:w-32 h-32 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 relative overflow-hidden">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    product.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 
                                    product.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                                    product.status === 'Draft' ? 'bg-slate-200 text-slate-700' :
                                    product.status === 'Out of Stock' ? 'bg-orange-100 text-orange-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {product.status}
                                </span>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 w-full text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                <div>
                                    <h3 className="font-bold text-black text-lg leading-tight group-hover:text-emerald-600 transition-colors">{product.name}</h3>
                                    <div className="flex items-center justify-center md:justify-start gap-2 mt-1 flex-wrap">
                                        {product.moqSet && Object.keys(product.moqSet).length > 0 && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                                                <Package className="w-3 h-3" />
                                                Bundle
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                            <Tag className="w-3 h-3" />
                                            <span className="font-mono">{product.sku}</span>
                                        </div>
                                        <span className="text-xs text-slate-500 hidden md:inline">•</span>
                                        <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{product.category}</span>
                                        {product.subCategory && (
                                            <>
                                                <span className="text-xs text-slate-500 hidden md:inline">•</span>
                                                <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{product.subCategory}</span>
                                            </>
                                        )}
                                        {product.productGroup && (
                                            <>
                                                <span className="text-xs text-slate-500 hidden md:inline">•</span>
                                                <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{product.productGroup}</span>
                                            </>
                                        )}
                                        
                                        <span className="text-xs text-slate-500 hidden md:inline">•</span>
                                        {/* Wholesaler Info - Admin Only */}
                                        <div className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                            <Store className="w-3 h-3" />
                                            <span className="font-semibold">{wholesalerName}</span>
                                            <span className="opacity-70 text-[10px]">({product.wholesalerId})</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 justify-center md:justify-end">
                                    <button 
                                        onClick={() => setViewingProduct(product)}
                                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-white shadow-sm transition-all"
                                        title="View as Retailer"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => openEditModal(product)}
                                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white shadow-sm transition-all"
                                        title="Edit Product"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3 bg-white/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Wholesale Base</p>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">৳{product.basePrice}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-emerald-600 font-bold">Retail Price</p>
                                    <p className="font-bold text-emerald-600">৳{product.sellingPrice}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Margin</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">{marginPercent}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Stock</p>
                                    <p className={`font-medium ${product.stock < 10 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {product.stock} <span className="text-[10px] text-slate-400 font-normal">({product.availableStock} Avail)</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">MOQ</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">{product.moq} Units</p>
                                </div>
                            </div>

                            {/* Status Actions */}
                            {(product.status === 'Pending Approval' || product.status === 'Draft') && (
                                <div className="flex gap-3 mt-4">
                                    <button onClick={() => handleApprove(product)} className="flex-1 md:flex-none px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors">
                                        <Check className="w-4 h-4" /> Approve
                                    </button>
                                    {product.status === 'Pending Approval' && (
                                        <button onClick={() => handleReject(product)} className="flex-1 md:flex-none px-6 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors">
                                            <X className="w-4 h-4" /> Reject
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                )})
            )}
        </div>

        {/* View Product Modal (Retailer Preview) */}
        {viewingProduct && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
                <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-6">
                     <div className="bg-white dark:bg-[#121212] w-full max-w-5xl md:rounded-3xl shadow-2xl relative overflow-hidden min-h-screen md:min-h-fit md:max-h-[90vh] md:overflow-y-auto">
                        <button 
                            onClick={() => setViewingProduct(null)}
                            className="absolute top-4 right-4 z-50 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-black" />
                        </button>
                        <div className="p-8 text-center text-slate-500">
                            <p className="text-lg font-bold mb-2">{viewingProduct.name}</p>
                            <p className="text-sm">Product preview not available (RetailerProductDetails removed).</p>
                        </div>
                     </div>
                </div>
            </div>
        )}

        {/* Edit / Add Product Modal */}
        {editingProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setEditingProduct(null); setIsAdding(false); }} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <ArrowLeft className="w-5 h-5 text-slate-500" />
                            </button>
                            <h3 className="text-lg font-bold text-black">
                                {isAdding ? 'Add New Product' : 'Edit & Approve Product'}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                                {editingProduct.status}
                             </span>
                        </div>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="flex flex-col lg:flex-row gap-8 h-full">
                             {/* Image Column */}
                             <div className="w-full lg:w-5/12 space-y-3 flex flex-col">
                                {/* Main Preview */}
                                <div className="h-[260px] w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shadow-md relative group shrink-0 flex items-center justify-center">
                                     {editImageUrls.length > 0 ? (
                                         <>
                                            <img src={editImageUrls[selectedImageIndex]} alt="" className="w-full h-full object-contain" />
                                            <div className="absolute top-3 left-3 z-10">
                                                {selectedImageIndex === 0 ? (
                                                    <div className="bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-bold flex items-center gap-1.5 backdrop-blur-sm">
                                                        <Star className="w-3.5 h-3.5 fill-current" />
                                                        MAIN PHOTO
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={setAsMainImage}
                                                        className="bg-white/90 hover:bg-emerald-500 hover:text-white text-slate-700 text-xs px-3 py-1.5 rounded-lg shadow-lg font-bold transition-all flex items-center gap-1.5 backdrop-blur-sm"
                                                    >
                                                        <Star className="w-3.5 h-3.5" />
                                                        Set as Main Photo
                                                    </button>
                                                )}
                                            </div>
                                            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                                                <button 
                                                    onClick={() => handleDownloadImage(editImageUrls[selectedImageIndex])}
                                                    className="p-2 bg-white/90 rounded-full text-slate-800 hover:text-emerald-600 transition-colors shadow-lg"
                                                    title="Download Image"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                         </>
                                     ) : (
                                         <div 
                                            className="text-center p-6 cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => fileInputRef.current?.click()}
                                         >
                                            <Upload className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-slate-500">Upload Product Image</p>
                                            <p className="text-xs text-slate-400">Click to browse files</p>
                                         </div>
                                     )}
                                     
                                     {/* Hidden File Input for Image Upload */}
                                     <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                     />
                                </div>

                                {/* Thumbnail Grid */}
                                <div className="space-y-2 shrink-0">
                                    <div className="flex justify-between items-center px-1">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase">Gallery ({editImageUrls.length})</h4>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                        {editImageUrls.map((url, idx) => (
                                            <div 
                                                key={idx} 
                                                className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all group ${
                                                    selectedImageIndex === idx ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                                onClick={() => setSelectedImageIndex(idx)}
                                            >
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                {idx === 0 && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-white text-[6px] font-bold text-center py-0.5">
                                                        MAIN
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                                    className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete this image"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <div 
                                            className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 shrink-0 text-slate-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" 
                                            title="Upload more"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Plus className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Nano Banana Engine UI */}
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800 relative overflow-hidden shrink-0 mt-4">
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
                                    
                                    <div className="flex items-center gap-2 mb-2 relative z-10">
                                        <div className="p-1 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Nano Banana AI Engine</h4>
                                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 leading-none">Generate new variations</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 relative z-10">
                                        <div>
                                            <input 
                                                type="text" 
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder="e.g. Add studio lighting, white background..."
                                                className="w-full px-3 py-1.5 bg-white text-black border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleNanoBananaEdit}
                                            disabled={isGeneratingImage || !aiPrompt || editImageUrls.length === 0}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
                                        >
                                            {isGeneratingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                            {isGeneratingImage ? 'Generating...' : 'Generate & Add Photo'}
                                        </button>
                                        {editImageUrls.length === 0 && (
                                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 text-center mt-1">Upload an image first to generate variations.</p>
                                        )}
                                    </div>
                                </div>
                             </div>

                             {/* Details Column */}
                             <div className="flex-1 space-y-5 overflow-y-auto">
                                <div className="bg-white/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4 relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-bold uppercase text-slate-500 tracking-wider">Product Information</h4>
                                        <div className="flex items-center gap-2">
                                            <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5">
                                                <button 
                                                    onClick={() => setAiLanguage('English')}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${aiLanguage === 'English' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                                >
                                                    English
                                                </button>
                                                <button 
                                                    onClick={() => setAiLanguage('Bangla')}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${aiLanguage === 'Bangla' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                                >
                                                    বাংলা
                                                </button>
                                            </div>
                                            <button 
                                                onClick={handleEnhanceDetails}
                                                disabled={isEnhancingDetails || editImageUrls.length === 0}
                                                className="group flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isEnhancingDetails ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                                                {aiLanguage === 'English' ? 'AI Enhancer' : 'AI ইমপ্রুভ'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                         <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                                            <select 
                                                value={editCategory}
                                                onChange={(e) => {
                                                    const cat = getCategoryByName(e.target.value);
                                                    setEditCategory(e.target.value);
                                                    setEditSubCategory(cat?.subCategories[0]?.name || '');
                                                    setEditProductGroup(cat?.subCategories[0]?.productGroups[0]?.name || '');
                                                    if (isAdding) {
                                                        const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
                                                        setEditSku(SKUGenerator.generate(
                                                            editingProduct?.wholesalerId || 'ADMIN',
                                                            cat?.code || '',
                                                            cat?.subCategories[0]?.code || '',
                                                            cat?.subCategories[0]?.productGroups[0]?.code || '',
                                                            sequence
                                                        ));
                                                    }
                                                }}
                                                className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                {CATEGORY_STRUCTURE.map(c => (
                                                    <option key={c.code} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                         </div>
                                         <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sub-Category</label>
                                            <select 
                                                value={editSubCategory}
                                                onChange={(e) => {
                                                    const subCat = getSubCategoryByName(editCategory, e.target.value);
                                                    setEditSubCategory(e.target.value);
                                                    setEditProductGroup(subCat?.productGroups[0]?.name || '');
                                                    if (isAdding) {
                                                        const cat = getCategoryByName(editCategory);
                                                        const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
                                                        setEditSku(SKUGenerator.generate(
                                                            editingProduct?.wholesalerId || 'ADMIN',
                                                            cat?.code || '',
                                                            subCat?.code || '',
                                                            subCat?.productGroups[0]?.code || '',
                                                            sequence
                                                        ));
                                                    }
                                                }}
                                                className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                {getCategoryByName(editCategory)?.subCategories.map(s => (
                                                    <option key={s.code} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                         </div>
                                         <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Product Group</label>
                                            <select 
                                                value={editProductGroup}
                                                onChange={(e) => {
                                                    setEditProductGroup(e.target.value);
                                                    if (isAdding) {
                                                        const cat = getCategoryByName(editCategory);
                                                        const subCat = getSubCategoryByName(editCategory, editSubCategory);
                                                        const group = getProductGroupByName(editCategory, editSubCategory, e.target.value);
                                                        const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
                                                        setEditSku(SKUGenerator.generate(
                                                            editingProduct?.wholesalerId || 'ADMIN',
                                                            cat?.code || '',
                                                            subCat?.code || '',
                                                            group?.code || '',
                                                            sequence
                                                        ));
                                                    }
                                                }}
                                                className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                {getSubCategoryByName(editCategory, editSubCategory)?.productGroups.map(g => (
                                                    <option key={g.code} value={g.name}>{g.name}</option>
                                                ))}
                                            </select>
                                         </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                         <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">SKU (Auto-Generated)</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text" 
                                                    value={editSku} 
                                                    readOnly
                                                    className="w-full px-4 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-sm font-mono" 
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const cat = getCategoryByName(editCategory);
                                                        const subCat = getSubCategoryByName(editCategory, editSubCategory);
                                                        const group = getProductGroupByName(editCategory, editSubCategory, editProductGroup);
                                                        const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
                                                        setEditSku(SKUGenerator.generate(
                                                            editingProduct?.wholesalerId || 'ADMIN',
                                                            cat?.code || '',
                                                            subCat?.code || '',
                                                            group?.code || '',
                                                            sequence
                                                        ));
                                                    }} 
                                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                                                    title="Regenerate SKU"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            </div>
                                         </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                                            <input 
                                                type="text" 
                                                value={editName} 
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                                                placeholder="Enter product name"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Brand Name</label>
                                                <input 
                                                    type="text" 
                                                    value={editBrandName} 
                                                    onChange={(e) => setEditBrandName(e.target.value)}
                                                    className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                                                    placeholder="e.g. Nike, Samsung"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Type *</label>
                                                <select 
                                                    value={editUnitType}
                                                    onChange={(e) => setEditUnitType(e.target.value)}
                                                    className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                >
                                                    <option value="piece">Piece</option>
                                                    <option value="dozen">Dozen</option>
                                                    <option value="carton">Carton</option>
                                                    <option value="kg">Kg</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                            <textarea 
                                                value={editDescription} 
                                                onChange={(e) => setEditDescription(e.target.value)}
                                                rows={5}
                                                className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                                                placeholder="Product description..."
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Available Sizes (Mandatory) *</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['Unique Size', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(size => {
                                                    const isSelected = editAvailableSizes.includes(size);
                                                    return (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            onClick={() => {
                                                                if (size === 'Unique Size') {
                                                                    setEditAvailableSizes(['Unique Size']);
                                                                    setEditMoqSet({});
                                                                } else {
                                                                    setEditAvailableSizes(prev => {
                                                                        const newSizes = prev.filter(s => s !== 'Unique Size');
                                                                        if (newSizes.includes(size)) {
                                                                            const updated = newSizes.filter(s => s !== size);
                                                                            if (updated.length === 0) return ['Unique Size'];
                                                                            return updated;
                                                                        }
                                                                        return [...newSizes, size];
                                                                    });
                                                                }
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                                                isSelected 
                                                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500'
                                                            }`}
                                                        >
                                                            {size}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Material/Fabric</label>
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    value={editMaterial}
                                                    onChange={(e) => setEditMaterial(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm"
                                                    placeholder="e.g. Cotton"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Color (Optional)</label>
                                            <div className="relative">
                                                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    value={editColor}
                                                    onChange={(e) => setEditColor(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm"
                                                    placeholder="e.g. Red"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (gm)</label>
                                            <div className="relative">
                                                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    value={editWeight}
                                                    onChange={(e) => setEditWeight(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm"
                                                    placeholder="e.g. 250"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Volume (Cubic feet)</label>
                                            <div className="relative">
                                                <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    value={editVolume}
                                                    onChange={(e) => setEditVolume(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm"
                                                    placeholder="e.g. 1.5"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Helper hint for AI */}
                                    {isEnhancingDetails && (
                                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-20">
                                            <div className="bg-white px-4 py-2 rounded-lg shadow-2xl flex items-center gap-3 border border-blue-100 dark:border-blue-900">
                                                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                                    {aiLanguage === 'English' ? 'Optimizing content...' : 'তথ্য উন্নত করা হচ্ছে...'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Variations & Bundles Block */}
                                <div className="bg-white rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-indigo-50 dark:bg-indigo-900/20 rounded text-indigo-600">
                                                <ListFilter className="w-4 h-4" />
                                            </div>
                                            <h4 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Variations & Bundles</h4>
                                        </div>
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                             <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Available Colors (comma separated)</label>
                                             <input 
                                                 type="text" 
                                                 value={variationColors}
                                                 onChange={(e) => setVariationColors(e.target.value)}
                                                 className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm"
                                                 placeholder="e.g. Red, Blue, Black" 
                                             />
                                         </div>
                                         <div>
                                             <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Available Designs (comma separated)</label>
                                             <input 
                                                 type="text" 
                                                 value={variationDesigns}
                                                 onChange={(e) => setVariationDesigns(e.target.value)}
                                                 className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm"
                                                 placeholder="e.g. Striped, Solid, Printed" 
                                             />
                                         </div>
                                     </div>
                                     <div className="flex gap-2">
                                         <button
                                             onClick={generateVariations}
                                             className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                         >
                                             Generate Variations
                                         </button>
                                         <button
                                             onClick={addManualVariation}
                                             className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-2"
                                         >
                                             <Plus className="w-4 h-4" /> Add Variation
                                         </button>
                                     </div>
                                    
                                    {editVariations.length > 0 ? (
                                        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 border-collapse">
                                                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                                    <tr>
                                                        <th className="px-4 py-3 font-bold">Color</th>
                                                        <th className="px-4 py-3 font-bold">Design</th>
                                                        <th className="px-4 py-3 font-bold">Variation Name</th>
                                                        <th className="px-4 py-3 font-bold">SKU</th>
                                                        <th className="px-4 py-3 font-bold">Stock</th>
                                                        <th className="px-4 py-3 font-bold">Price (৳)</th>
                                                        <th className="px-4 py-3 font-bold">Media</th>
                                                        <th className="px-4 py-3 font-bold text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {editVariations.map((variation, idx) => (
                                                        <tr key={variation.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <input 
                                                                    type="text" 
                                                                    value={variation.color || ''}
                                                                    onChange={(e) => updateVariation(idx, 'color', e.target.value)}
                                                                    placeholder="Color"
                                                                    className="w-24 px-3 py-1.5 bg-white text-black border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input 
                                                                    type="text" 
                                                                    value={variation.design || ''}
                                                                    onChange={(e) => updateVariation(idx, 'design', e.target.value)}
                                                                    placeholder="Design"
                                                                    className="w-24 px-3 py-1.5 bg-white text-black border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input 
                                                                    type="text" 
                                                                    value={variation.subName}
                                                                    onChange={(e) => updateVariation(idx, 'subName', e.target.value)}
                                                                    className="w-48 px-3 py-1.5 bg-white text-black border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm font-medium"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input 
                                                                    type="text" 
                                                                    value={variation.subSku}
                                                                    onChange={(e) => updateVariation(idx, 'subSku', e.target.value)}
                                                                    className="w-32 px-3 py-1.5 bg-white text-black border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm font-mono"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input 
                                                                    type="number" 
                                                                    value={variation.stock}
                                                                    min="0"
                                                                    onChange={(e) => updateVariation(idx, 'stock', Math.max(0, Number(e.target.value)))}
                                                                    className="w-20 px-3 py-1.5 bg-white text-black border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                 <input 
                                                                     type="number"
                                                                     value={variation.price}
                                                                     min="0"
                                                                     onChange={(e) => updateVariation(idx, 'price', Math.max(0, Number(e.target.value)))}
                                                                     className="w-24 px-3 py-1.5 bg-white text-black border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm font-bold text-emerald-600"
                                                                 />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative group/media">
                                                                        {variation.photoUrl ? (
                                                                            <div className="relative w-8 h-8 rounded border border-slate-200 overflow-hidden">
                                                                                <img src={variation.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                                                                    <button
                                                                                        onClick={() => handleVariationNanoBananaEdit(idx)}
                                                                                        disabled={isGeneratingImage || !aiPrompt}
                                                                                        className="p-1 text-white hover:text-purple-400 disabled:opacity-50"
                                                                                    >
                                                                                        <Wand2 className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <label className="flex items-center justify-center w-8 h-8 rounded border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer">
                                                                                <ImageIcon className="w-3 h-3 text-slate-400" />
                                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (file) {
                                                                                        const updated = [...editVariations];
                                                                                        updated[idx].photoUrl = URL.createObjectURL(file);
                                                                                        setEditVariations(updated);
                                                                                    }
                                                                                }} />
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                    <div className="relative group/video">
                                                                        <label className={`flex items-center justify-center w-8 h-8 rounded border transition-all cursor-pointer ${variation.videoUrl ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-400'}`}>
                                                                            <Upload className="w-3 h-3" />
                                                                            <input type="file" accept="video/*" className="hidden" onChange={(e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file) {
                                                                                    const updated = [...editVariations];
                                                                                    updated[idx].videoUrl = URL.createObjectURL(file);
                                                                                    setEditVariations(updated);
                                                                                }
                                                                            }} />
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <button 
                                                                    onClick={() => removeVariation(idx)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Remove Variation"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                            <p className="text-sm text-slate-500">No variations added yet.</p>
                                        </div>
                                    )}

                                    <div className="p-3 bg-white/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Bundle/Set Description (Optional)</label>
                                            <input 
                                                type="text" 
                                                value={editBundleDescription}
                                                onChange={(e) => setEditBundleDescription(e.target.value)}
                                                className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                placeholder="e.g. 2 Small, 2 Medium, 2 Large, 2 Extra Large" 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Video (Optional)</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="url" 
                                                value={editVideoUrl}
                                                onChange={(e) => setEditVideoUrl(e.target.value)}
                                                className="flex-1 px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                placeholder="e.g. https://youtube.com/watch?v=... or upload" 
                                            />
                                            <label className="cursor-pointer px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
                                                Upload Video
                                                <input 
                                                    type="file" 
                                                    accept="video/*" 
                                                    className="hidden" 
                                                    onChange={handleVideoUpload}
                                                />
                                            </label>
                                        </div>
                                        {editVideoUrl && !editVideoUrl.includes('youtube.com') && !editVideoUrl.includes('youtu.be') && (
                                            <video src={editVideoUrl} className="mt-2 h-32 rounded-lg object-cover border border-slate-200" controls />
                                        )}
                                    </div>
                                </div>

                                {/* Inventory & Logistics Block */}
                                <div className="bg-white rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-600">
                                            <Store className="w-4 h-4" />
                                        </div>
                                        <h4 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Inventory & Logistics</h4>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Total Stock *</label>
                                             <input 
                                                 type="number"
                                                 value={editStock} 
                                                 min="0"
                                                 onChange={(e) => setEditStock(Math.max(0, Number(e.target.value)))}
                                                 className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" 
                                                 placeholder="0"
                                             />
                                        </div>
                                        
                                        {editAvailableSizes.includes('Unique Size') ? (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">MOQ *</label>
                                                 <input 
                                                     type="number"
                                                     value={editMoq} 
                                                     min="1"
                                                     onChange={(e) => setEditMoq(Math.max(1, Number(e.target.value)))}
                                                     className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" 
                                                     placeholder="1"
                                                 />
                                            </div>
                                        ) : (
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">MOQ Set (Bundle/Set) *</label>
                                                <div className="p-3 bg-white/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {editAvailableSizes.filter(s => s !== 'Unique Size').map(size => (
                                                            <div key={size} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                                                <span className="font-bold text-slate-700 dark:text-slate-300 w-6 text-center text-xs">{size}</span>
                                                                <select
                                                                    value={editMoqSet[size] || 0}
                                                                    onChange={(e) => setEditMoqSet(prev => ({ ...prev, [size]: Number(e.target.value) }))}
                                                                    className="flex-1 bg-white text-black border border-slate-200 rounded text-xs py-1 px-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                >
                                                                    {[0, 1, 2, 3, 4, 5, 6, 8, 10, 12].map(num => (
                                                                        <option key={num} value={num}>{num}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-2 text-xs text-slate-500 flex justify-between items-center">
                                                        <span>Total items in one MOQ Set:</span>
                                                        <span className="font-bold text-emerald-600 text-sm">
                                                            {Object.values(editMoqSet).reduce((sum, val) => sum + (val || 0), 0)} pcs
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {editAvailableSizes.includes('Unique Size') && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Dispatch Time</label>
                                                <select 
                                                    value={editDispatchTime}
                                                    onChange={(e) => setEditDispatchTime(e.target.value)}
                                                    className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                                >
                                                    <option value="24h">24 Hours</option>
                                                    <option value="48h">48 Hours</option>
                                                    <option value="72h">3 Days</option>
                                                    <option value="5-7d">5-7 Days</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {!editAvailableSizes.includes('Unique Size') && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Dispatch Time</label>
                                            <select 
                                                value={editDispatchTime}
                                                onChange={(e) => setEditDispatchTime(e.target.value)}
                                                className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                <option value="24h">24 Hours</option>
                                                <option value="48h">48 Hours</option>
                                                <option value="72h">3 Days</option>
                                                <option value="5-7d">5-7 Days</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 bg-white rounded-xl space-y-4 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1 bg-emerald-100 rounded text-emerald-600">
                                            <Scale className="w-4 h-4" />
                                        </div>
                                        <h4 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Pricing Control</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Base Price (Cost)</label>
                                             <input 
                                                 type="number"
                                                 value={editBasePrice} 
                                                 min="0"
                                                 onChange={(e) => {
                                                     const val = Math.max(0, Number(e.target.value));
                                                     setEditBasePrice(val);
                                                     const wholesaler = wholesalers.find(w => w.id === editingProduct.wholesalerId) || MOCK_WHOLESALERS.find(w => w.id === editingProduct.wholesalerId);
                                                     setEditSellingPrice(PricingEngine.calculateSellingPrice(val, editingProduct.category, wholesaler?.commissionRate));
                                                 }}
                                                 className="w-full px-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm font-bold" 
                                             />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-emerald-600 uppercase mb-1">Final Retail Price</label>
                                             <input 
                                                 type="number"
                                                 value={editSellingPrice} 
                                                 min="0"
                                                 onChange={(e) => setEditSellingPrice(Math.max(0, Number(e.target.value)))}
                                                 className="w-full px-4 py-2 bg-white text-black border-2 border-emerald-500/50 rounded-lg text-sm font-bold text-emerald-600 shadow-sm focus:border-emerald-600 outline-none" 
                                             />
                                        </div>
                                        <div className="col-span-2 border-t border-dashed border-slate-200 pt-3 mt-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-orange-500 uppercase">Discount Offer (Optional)</label>
                                                {editDiscountPercentage > 0 && (
                                                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                                                        Retailer sees: <span className="line-through text-slate-400">৳{Math.round(editSellingPrice / (1 - (editDiscountPercentage/100)))}</span> ৳{editSellingPrice}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="relative flex-1">
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        max="99"
                                                        value={editDiscountPercentage} 
                                                        onChange={(e) => setEditDiscountPercentage(Math.max(0, Math.min(99, Number(e.target.value))))}
                                                        className="w-full px-4 py-2 bg-white text-black border border-orange-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none" 
                                                        placeholder="0"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                                </div>
                                                <div className="text-xs text-slate-500 flex-1">
                                                    <p>Set a discount percentage to show a "Compare At" price. The Final Retail Price remains <strong>৳{editSellingPrice}</strong>.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sponsored Product Settings */}
                                <div className="bg-white rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-purple-50 dark:bg-purple-900/20 rounded text-purple-600">
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                            <h4 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Sponsored Product</h4>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={editIsSponsored}
                                                onChange={(e) => setEditIsSponsored(e.target.checked)}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>
                                    
                                    {editIsSponsored && (
                                        <div className="animate-fade-in pt-2 border-t border-slate-100 dark:border-slate-700">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Sponsored Until</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-4 py-2 bg-white text-black border border-purple-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500/20 outline-none"
                                                value={editSponsoredUntil}
                                                onChange={(e) => setEditSponsoredUntil(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Product will appear at the top of lists until this date.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Featured Product Settings */}
                                <div className="bg-white rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-gold-50 dark:bg-gold-900/20 rounded text-gold-600">
                                                <Star className="w-4 h-4" />
                                            </div>
                                            <h4 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Featured Product</h4>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={editIsFeatured}
                                                onChange={(e) => setEditIsFeatured(e.target.checked)}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-300 dark:peer-focus:ring-gold-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-gold-500"></div>
                                        </label>
                                    </div>
                                    
                                    {editIsFeatured && (
                                        <div className="animate-fade-in pt-2 border-t border-slate-100 dark:border-slate-700">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Featured Until</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-4 py-2 bg-white text-black border border-gold-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-gold-500/20 outline-none"
                                                value={editFeaturedUntil}
                                                onChange={(e) => setEditFeaturedUntil(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Product will appear in the Featured list until this date.
                                            </p>
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white rounded-b-2xl z-10 shrink-0">
                        <button onClick={() => { setEditingProduct(null); setIsAdding(false); }} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
                        {!isAdding && (
                            <button 
                                onClick={handleModalReject}
                                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                            >
                                <XCircle className="w-4 h-4" /> Reject
                            </button>
                        )}
                        <button onClick={handleSaveEdit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg hover:bg-emerald-700 flex items-center gap-2 transform active:scale-95 transition-all">
                            <Save className="w-4 h-4" /> 
                            {isAdding ? 'Create & Approve' : 'Save & Approve'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};