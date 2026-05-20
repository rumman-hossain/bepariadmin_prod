import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Search, Filter, CheckCircle, XCircle, Clock, Star, Zap, ArrowLeft, MapPin, Building, FileText, Download, DollarSign, Package, Save, ExternalLink, ThumbsUp, ThumbsDown, AlertTriangle, Plus, X, UploadCloud, Smartphone, User, CreditCard, Mail, Check, Box, Edit2, ShieldAlert } from 'lucide-react';
import { Card } from './ui/Card';
import { MOCK_ORDERS, WHOLESALER_PAYMENTS } from '../services/mockData';
import { Wholesaler, Product } from '../types';

interface WholesalersProps {
    wholesalers?: Wholesaler[];
    products?: Product[];
    onUpdateStatus?: (id: string, status: 'Active' | 'Suspended') => void;
    onAddWholesaler?: (wholesaler: Wholesaler) => void;
    onUpdateWholesaler?: (wholesaler: Wholesaler) => void;
}

export const Wholesalers: React.FC<WholesalersProps> = ({ wholesalers = [], products = [], onUpdateStatus, onAddWholesaler, onUpdateWholesaler }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWholesaler, setSelectedWholesaler] = useState<Wholesaler | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(15); // Default commission
  const [historyTab, setHistoryTab] = useState<'Accepted' | 'Rejected'>('Accepted');
  const [showLiveProducts, setShowLiveProducts] = useState(false);
  
  // Filtering
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterRecentlyAdded, setFilterRecentlyAdded] = useState(false);

  // Modal State
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editedWholesaler, setEditedWholesaler] = useState<Wholesaler | null>(null);
  const idCardRef = useRef<HTMLDivElement>(null);

  const handleDownloadIdCard = async () => {
      if (!idCardRef.current || !selectedWholesaler) return;
      
      try {
          const canvas = await html2canvas(idCardRef.current, {
              scale: 2,
              backgroundColor: '#ffffff',
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'px',
              format: [canvas.width, canvas.height]
          });
          
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save(`${selectedWholesaler.companyName.replace(/\s+/g, '_')}_ID_Card.pdf`);
      } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Failed to generate PDF. Please try again.');
      }
  };

  const handleEditClick = () => {
      if (selectedWholesaler) {
          const isNewData = selectedWholesaler.address !== undefined;
          const initialData = { ...selectedWholesaler };
          
          if (!isNewData) {
              initialData.address = defaultExtendedDetails.address;
              initialData.mobile = defaultExtendedDetails.phone;
              initialData.email = defaultExtendedDetails.email;
              initialData.bankDetails = defaultExtendedDetails.bankDetails;
          }

          setEditedWholesaler(initialData);
          setIsEditing(true);
      }
  };

  const handleSaveEdit = () => {
      if (editedWholesaler && onUpdateWholesaler) {
          onUpdateWholesaler(editedWholesaler);
          setSelectedWholesaler(editedWholesaler);
          setIsEditing(false);
          setEditedWholesaler(null);
      }
  };

  const handleCancelEdit = () => {
      setIsEditing(false);
      setEditedWholesaler(null);
  };

  // New Wholesaler Form State
  const [newCompany, setNewCompany] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCategory, setNewCategory] = useState('Apparel');
  const [newLocation, setNewLocation] = useState('Dhaka');
  const [newAddress, setNewAddress] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Bank Details
  const [newBankName, setNewBankName] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newRouting, setNewRouting] = useState('');
  const [newBkash, setNewBkash] = useState('');

  // Document Upload Mock State
  const [uploadedDocs, setUploadedDocs] = useState<{
      tradeLicense: boolean;
      tin: boolean;
      vat: boolean;
      nid: boolean;
  }>({ tradeLicense: false, tin: false, vat: false, nid: false });

  // Default Mock Details for Existing Items (Legacy Data)
  const defaultExtendedDetails = {
    address: "128/A, Motijheel C/A, Dhaka-1000",
    phone: "+880 1711-000000",
    email: "contact@megatextiles.com",
    bankDetails: {
        bankName: "Dutch Bangla Bank Ltd",
        accountName: "Mega Textiles Ltd",
        accountNumber: "112.101.99281",
        branch: "Motijheel Branch",
        routing: "099283711"
    },
    documents: [
        { name: "Trade License.pdf", date: "2023-01-15", status: "Verified" },
        { name: "TIN Certificate.pdf", date: "2023-01-15", status: "Verified" },
        { name: "VAT Registration.pdf", date: "2023-02-10", status: "Verified" },
        { name: "Owner NID.jpg", date: "2023-01-15", status: "Verified" }
    ]
  };

  const uniqueLocations = Array.from(new Set(wholesalers.map(w => w.location || 'Dhaka')));
  const uniqueCategories = Array.from(new Set(wholesalers.map(w => w.category)));

  const handleWholesalerClick = (wholesaler: Wholesaler) => {
      setSelectedWholesaler(wholesaler);
      // Reset commission to a "fetched" value or default
      setCommissionRate(wholesaler.commissionRate !== undefined ? wholesaler.commissionRate : 15); 
      setHistoryTab('Accepted');
      setShowSuspendModal(false);
      setShowLiveProducts(false);
      setIsEditing(false);
      setEditedWholesaler(null);
  };

  const handleSaveCommission = () => {
      setShowCommissionModal(true);
  };

  const confirmCommissionSave = () => {
      if (selectedWholesaler && onUpdateWholesaler) {
          const updatedWholesaler = { ...selectedWholesaler, commissionRate };
          onUpdateWholesaler(updatedWholesaler);
          setSelectedWholesaler(updatedWholesaler);
          alert(`Commission rate for ${selectedWholesaler.companyName} updated to ${commissionRate}%`);
      }
      setShowCommissionModal(false);
  };

  const handleSuspendClick = () => {
      if (!selectedWholesaler) return;
      if (selectedWholesaler.status === 'Suspended') {
          // If already suspended, Activate immediately
          if (onUpdateStatus) {
              onUpdateStatus(selectedWholesaler.id, 'Active');
              setSelectedWholesaler({ ...selectedWholesaler, status: 'Active' });
          }
      } else {
          // If active, show confirmation modal
          setShowSuspendModal(true);
      }
  };

  const confirmSuspend = () => {
      if (selectedWholesaler && onUpdateStatus) {
          onUpdateStatus(selectedWholesaler.id, 'Suspended');
          setSelectedWholesaler({ ...selectedWholesaler, status: 'Suspended' });
          setShowSuspendModal(false);
      }
  };

  const handleSubmitNewWholesaler = () => {
      if (!newCompany || !newOwnerName || !newMobile) {
          alert("Please fill in the required fields (Company, Owner Name, Mobile).");
          return;
      }
      
      // Construct documents array based on selection
      const docs = [];
      if (uploadedDocs.tradeLicense) docs.push({ name: "Trade License", status: "Pending" });
      if (uploadedDocs.tin) docs.push({ name: "TIN Certificate", status: "Pending" });
      if (uploadedDocs.vat) docs.push({ name: "VAT Registration", status: "Pending" });
      if (uploadedDocs.nid) docs.push({ name: "Owner NID", status: "Pending" });

      const newWholesaler: Wholesaler = {
          id: `WHL-${Date.now().toString().slice(-4)}`,
          companyName: newCompany,
          category: newCategory,
          location: newLocation,
          status: 'Active',
          acceptanceRate: 100, // New supplier default
          dispatchSpeed: '24h', // Default promise
          
          // Extended Info
          ownerName: newOwnerName,
          mobile: newMobile,
          email: newEmail,
          address: newAddress,
          bkash: newBkash,
          createdAt: new Date().toISOString().split('T')[0],
          bankDetails: {
              bankName: newBankName,
              accountName: newAccName,
              accountNumber: newAccNumber,
              branch: newBranch,
              routing: newRouting
          },
          documents: docs
      };

      if (onAddWholesaler) {
          onAddWholesaler(newWholesaler);
      }
      setShowAddModal(false);
      
      // Reset Form
      setNewCompany('');
      setNewOwnerName('');
      setNewMobile('');
      setNewEmail('');
      setNewAddress('');
      setNewBankName('');
      setNewAccName('');
      setNewAccNumber('');
      setNewBranch('');
      setNewRouting('');
      setNewBkash('');
      setUploadedDocs({ tradeLicense: false, tin: false, vat: false, nid: false });
  };

  const toggleDoc = (key: keyof typeof uploadedDocs) => {
      setUploadedDocs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter orders for this wholesaler (using mock matching logic)
  const wholesalerOrders = selectedWholesaler 
      ? MOCK_ORDERS.filter(o => o.wholesalerName === selectedWholesaler.companyName || o.wholesalerName === 'Me') 
      : [];

  const wholesalerPayouts = selectedWholesaler
      ? WHOLESALER_PAYMENTS.filter(p => p.wholesalerId === selectedWholesaler.id)
      : [];

  // Filter live products
  const liveProducts = selectedWholesaler
      ? products.filter(p => p.wholesalerId === selectedWholesaler.id && (p.status === 'Approved' || p.status === 'Out of Stock'))
      : [];

  // Derived History Lists
  const acceptedOrders = wholesalerOrders.filter(o => 
      ['Supplier Accepted', 'Awaiting Partial Payment', 'Payment Verified', 'Confirmed', 'Label Generated', 'Dispatched', 'Delivered', 'Settled'].includes(o.status)
  );
  
  const rejectedOrders = wholesalerOrders.filter(o => o.status === 'Rejected');

  // Filtered Wholesalers List
  const filteredWholesalers = wholesalers.filter(w => {
      const matchesSearch = (w.companyName || '').toLowerCase().includes((searchTerm || '').toLowerCase());
      const matchesCategory = filterCategory === 'All' || w.category === filterCategory;
      const matchesLocation = filterLocation === 'All' || w.location === filterLocation;
      
      let matchesRecent = true;
      if (filterRecentlyAdded && w.createdAt) {
          const createdDate = new Date(w.createdAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          matchesRecent = createdDate >= thirtyDaysAgo;
      }

      return matchesSearch && matchesCategory && matchesLocation && matchesRecent;
  });

  // Calculate Details to Display
  const isNewData = selectedWholesaler && selectedWholesaler.address !== undefined;

  const displayAddress = isNewData ? (selectedWholesaler?.address || "Not Added") : defaultExtendedDetails.address;
  const displayPhone = isNewData ? (selectedWholesaler?.mobile || "Not Added") : defaultExtendedDetails.phone;
  const displayEmail = isNewData ? (selectedWholesaler?.email || "Not Added") : defaultExtendedDetails.email;
  
  const displayBank = isNewData 
      ? (selectedWholesaler?.bankDetails?.bankName ? selectedWholesaler.bankDetails : null)
      : defaultExtendedDetails.bankDetails;

  const displayDocs = isNewData
      ? (selectedWholesaler?.documents && selectedWholesaler.documents.length > 0 ? selectedWholesaler.documents : [])
      : defaultExtendedDetails.documents;


  if (selectedWholesaler) {
      return (
          <div className="space-y-6 animate-fade-in pb-10 relative">
              
              {/* Commission Confirmation Modal */}
              {showCommissionModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                      <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
                          <div className="p-6 text-center">
                              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <AlertTriangle className="w-8 h-8" />
                              </div>
                              <h3 className="text-xl font-bold text-black mb-2">Update Commission Rate?</h3>
                              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                  Are you sure you want to update the platform commission to <strong>{commissionRate}%</strong>? This will affect all future orders for this supplier.
                              </p>
                              
                              <div className="flex gap-3 justify-center">
                                  <button 
                                      onClick={() => setShowCommissionModal(false)}
                                      className="px-5 py-2.5 bg-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  >
                                      Cancel
                                  </button>
                                  <button 
                                      onClick={confirmCommissionSave}
                                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-600/30 transition-colors"
                                  >
                                      Confirm Update
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Suspend Confirmation Modal */}
              {showSuspendModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                      <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
                          <div className="p-6 text-center">
                              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <AlertTriangle className="w-8 h-8" />
                              </div>
                              <h3 className="text-xl font-bold text-black mb-2">Suspend {selectedWholesaler.companyName}?</h3>
                              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                  This action will <strong>immediately hide all approved products</strong> from the Retailer Portal and disable new product submissions. Are you sure you want to proceed?
                              </p>
                              
                              <div className="flex gap-3 justify-center">
                                  <button 
                                      onClick={() => setShowSuspendModal(false)}
                                      className="px-5 py-2.5 bg-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  >
                                      Cancel
                                  </button>
                                  <button 
                                      onClick={confirmSuspend}
                                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-600/30 transition-colors"
                                  >
                                      Confirm Suspension
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Live Products Modal */}
              {showLiveProducts && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                      <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-gray-200/50 dark:border-gray-800/50">
                          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200/50 dark:border-gray-800/50">
                              <div className="flex items-center gap-3">
                                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600">
                                      <Box className="w-5 h-5" />
                                  </div>
                                  <div>
                                      <h3 className="text-lg font-bold text-black">Live Products</h3>
                                      <p className="text-xs text-slate-500">{selectedWholesaler.companyName} • {liveProducts.length} Active Items</p>
                                  </div>
                              </div>
                              <button onClick={() => setShowLiveProducts(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                  <X className="w-5 h-5 text-slate-500" />
                              </button>
                          </div>
                          
                          <div className="overflow-y-auto flex-1 p-0">
                              {liveProducts.length > 0 ? (
                                  <table className="w-full text-sm text-left">
                                      <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10">
                                          <tr>
                                              <th className="px-6 py-3">Product</th>
                                              <th className="px-6 py-3">SKU</th>
                                              <th className="px-6 py-3">Stock</th>
                                              <th className="px-6 py-3 text-right">Wholesale Price</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {liveProducts.map(product => (
                                              <tr key={product.id} className="border-b border-gray-200/50 dark:border-gray-800/50 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                                                  <td className="px-6 py-3">
                                                      <div className="flex items-center gap-3">
                                                          <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                                                          <div className="font-medium text-black">{product.name}</div>
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-3 font-mono text-slate-500">{product.sku}</td>
                                                  <td className="px-6 py-3">
                                                      <span className={`font-bold ${product.stock < 10 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                                          {product.stock}
                                                      </span>
                                                  </td>
                                                  <td className="px-6 py-3 text-right font-bold text-black">৳{product.basePrice.toLocaleString()}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              ) : (
                                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                      <Package className="w-12 h-12 mb-3 opacity-20" />
                                      <p className="font-medium">No live products found.</p>
                                      <p className="text-xs mt-1">Products must be 'Approved' to appear here.</p>
                                  </div>
                              )}
                          </div>
                          
                          <div className="p-4 bg-transparent border-t border-gray-200/50 dark:border-gray-800/50 flex justify-end">
                              <button 
                                  onClick={() => setShowLiveProducts(false)}
                                  className="px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                  Close
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-4 mb-2">
                  <button 
                    onClick={() => {
                        setSelectedWholesaler(null);
                        setIsEditing(false);
                        setEditedWholesaler(null);
                    }}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                      <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                  </button>
                  <div>
                      <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                          {isEditing ? (
                              <input 
                                  type="text" 
                                  value={editedWholesaler?.companyName || ''} 
                                  onChange={(e) => setEditedWholesaler(prev => prev ? ({ ...prev, companyName: e.target.value }) : null)}
                                  className="border border-slate-300 rounded px-2 py-1 text-lg font-bold bg-white text-black"
                              />
                          ) : (
                              selectedWholesaler.companyName
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${
                                selectedWholesaler.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                selectedWholesaler.status === 'Suspended' ? 'bg-red-50 text-red-700 border-red-200' : 
                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>
                                {selectedWholesaler.status}
                          </span>
                      </h1>
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <span>ID: {selectedWholesaler.id}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedWholesaler.location || 'Dhaka'}</span>
                          {selectedWholesaler.ownerName && (
                              <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedWholesaler.ownerName}</span>
                              </>
                          )}
                      </div>
                  </div>
                  <div className="ml-auto flex gap-2">
                      {isEditing ? (
                          <>
                              <button 
                                  onClick={handleCancelEdit}
                                  className="px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                              >
                                  <X className="w-4 h-4" /> Cancel
                              </button>
                              <button 
                                  onClick={handleSaveEdit}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center gap-2"
                              >
                                  <Save className="w-4 h-4" /> Save Changes
                              </button>
                          </>
                      ) : (
                          <>
                              <button 
                                onClick={() => setShowLiveProducts(true)}
                                className="px-4 py-2 bg-white border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-2"
                              >
                                  <Package className="w-4 h-4" /> Live Products
                              </button>
                              
                              <button 
                                  onClick={handleEditClick}
                                  className="px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                              >
                                  <Edit2 className="w-4 h-4" /> Edit Profile
                              </button>

                              <button 
                                onClick={handleSuspendClick}
                                className={`px-4 py-2 border rounded-lg text-sm font-bold shadow-sm transition-colors ${
                                    selectedWholesaler.status === 'Suspended' 
                                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                    : 'bg-white border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                }`}
                              >
                                  {selectedWholesaler.status === 'Suspended' ? 'Activate Account' : 'Suspend Account'}
                              </button>
                              <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">
                                  Send Message
                              </button>
                          </>
                      )}
                  </div>
              </div>

              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-charcoal-800">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
                          <Package className="w-6 h-6" />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Total Orders</p>
                          <p className="text-xl font-bold text-black">1,245</p>
                      </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-charcoal-800">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600">
                          <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Total Payout</p>
                          <p className="text-xl font-bold text-black">৳ 4.2M</p>
                      </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-gold-50 to-white dark:from-gold-900/10 dark:to-charcoal-800">
                      <div className="p-3 bg-gold-100 dark:bg-gold-900/30 rounded-full text-gold-600">
                          <Star className="w-6 h-6" />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Rating</p>
                          <p className="text-xl font-bold text-black">4.8/5</p>
                      </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-charcoal-800">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600">
                          <Zap className="w-6 h-6" />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Dispatch Speed</p>
                          <p className="text-xl font-bold text-black">{selectedWholesaler.dispatchSpeed}</p>
                      </div>
                  </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Info & Commission */}
                  <div className="space-y-6 lg:col-span-1">
                      {/* Commission Control */}
                      <Card title="Commission Settings">
                          <div className="bg-white/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Platform Commission (%)</label>
                              <div className="flex gap-2">
                                  <input 
                                      type="number" 
                                      min="0"
                                      value={commissionRate}
                                      onChange={(e) => setCommissionRate(Math.max(0, Number(e.target.value)))}
                                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-black focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                  />
                                  <button 
                                      onClick={handleSaveCommission}
                                      className="bg-charcoal-900 dark:bg-emerald-600 text-white px-4 rounded-lg hover:opacity-90 transition-opacity"
                                  >
                                      <Save className="w-4 h-4" />
                                  </button>
                              </div>
                              <p className="text-xs text-slate-400 mt-2">
                                  Updating this will affect all future orders for this supplier.
                              </p>
                          </div>
                      </Card>

                      {/* Details Card */}
                      <Card title="Business Profile">
                          <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                  <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                                  <div className="w-full">
                                      <p className="text-xs font-bold text-slate-500 uppercase">Address</p>
                                      {isEditing ? (
                                          <textarea 
                                              rows={3}
                                              value={editedWholesaler?.address || ''}
                                              onChange={(e) => setEditedWholesaler(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                                              className="w-full mt-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-black"
                                          />
                                      ) : (
                                          <p className={`text-sm ${displayAddress === 'Not Added' ? 'text-slate-400 italic' : 'text-slate-700 dark:text-slate-300'}`}>
                                              {displayAddress}
                                          </p>
                                      )}
                                      
                                      <div className="mt-2">
                                          <p className="text-xs font-bold text-slate-500 uppercase">Contact</p>
                                          <div className="flex items-center gap-2 mt-1">
                                              <Smartphone className="w-3 h-3 text-slate-400" /> 
                                              {isEditing ? (
                                                  <input 
                                                      type="text" 
                                                      value={editedWholesaler?.mobile || ''}
                                                      onChange={(e) => setEditedWholesaler(prev => prev ? ({ ...prev, mobile: e.target.value }) : null)}
                                                      className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                                      placeholder="Mobile Number"
                                                  />
                                              ) : (
                                                  <span className={displayPhone === 'Not Added' ? 'text-slate-400 italic' : 'text-sm text-slate-700 dark:text-slate-300'}>{displayPhone}</span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                              <Mail className="w-3 h-3 text-slate-400" />
                                              {isEditing ? (
                                                  <input 
                                                      type="email" 
                                                      value={editedWholesaler?.email || ''}
                                                      onChange={(e) => setEditedWholesaler(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                                                      className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                                      placeholder="Email Address"
                                                  />
                                              ) : (
                                                  <span className={displayEmail === 'Not Added' ? 'text-slate-400 italic' : 'text-sm text-slate-700 dark:text-slate-300'}>{displayEmail}</span>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-start gap-3">
                                  <Building className="w-4 h-4 text-slate-400 mt-1" />
                                  <div className="w-full">
                                      <p className="text-xs font-bold text-slate-500 uppercase">Bank Details</p>
                                      {isEditing ? (
                                          <div className="space-y-2 mt-1">
                                              <input 
                                                  type="text" 
                                                  placeholder="Bank Name"
                                                  value={editedWholesaler?.bankDetails?.bankName || ''}
                                                  onChange={(e) => setEditedWholesaler(prev => prev ? ({ ...prev, bankDetails: { ...prev.bankDetails!, bankName: e.target.value } }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                              />
                                              <input 
                                                  type="text" 
                                                  placeholder="Account Name"
                                                  value={editedWholesaler?.bankDetails?.accountName || ''}
                                                  onChange={(e) => setEditedWholesaler(prev => prev ? ({ ...prev, bankDetails: { ...prev.bankDetails!, accountName: e.target.value } }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                              />
                                              <input 
                                                  type="text" 
                                                  placeholder="Account Number"
                                                  value={editedWholesaler?.bankDetails?.accountNumber || ''}
                                                  onChange={(e) => setEditedWholesaler(prev => prev ? ({ ...prev, bankDetails: { ...prev.bankDetails!, accountNumber: e.target.value } }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                              />
                                              <input 
                                                  type="text" 
                                                  placeholder="Branch"
                                                  value={editedWholesaler?.bankDetails?.branch || ''}
                                                  onChange={(e) => setEditedWholesaler(prev => prev ? ({ ...prev, bankDetails: { ...prev.bankDetails!, branch: e.target.value } }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                              />
                                          </div>
                                      ) : (
                                          displayBank ? (
                                              <>
                                                  <p className="text-sm font-semibold text-black">{displayBank.bankName || <span className="text-slate-400 font-normal italic">Bank Name Not Added</span>}</p>
                                                  <p className="text-xs text-slate-500">{displayBank.accountName}</p>
                                                  <p className="text-xs text-slate-500 font-mono mt-1">{displayBank.accountNumber}</p>
                                                  <p className="text-xs text-slate-500 mt-0.5">{displayBank.branch}</p>
                                              </>
                                          ) : (
                                              <p className="text-sm text-slate-400 italic">Not Added</p>
                                          )
                                      )}
                                      
                                      <div className="mt-2 flex items-center gap-2 text-xs">
                                          <span className="font-bold text-pink-600">bKash:</span>
                                          {isEditing ? (
                                              <input 
                                                  type="text" 
                                                  value={editedWholesaler?.bkash || ''}
                                                  onChange={(e) => setEditedWholesaler(prev => prev ? ({ ...prev, bkash: e.target.value }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                                  placeholder="bKash Number"
                                              />
                                          ) : (
                                              <span className={`font-mono ${!selectedWholesaler.bkash && isNewData ? 'text-slate-400 italic' : 'text-slate-700 dark:text-slate-300'}`}>
                                                  {selectedWholesaler.bkash || (isNewData ? 'Not Added' : '01711000000')}
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-start gap-3">
                                  <FileText className="w-4 h-4 text-slate-400 mt-1" />
                                  <div className="w-full">
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Documents</p>
                                      {displayDocs.length > 0 ? (
                                          <div className="space-y-2">
                                              {displayDocs.map((doc, i) => (
                                                  <div key={i} className="flex justify-between items-center p-2 bg-white/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                                      <div className="flex items-center gap-2">
                                                          {doc.status === 'Verified' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-yellow-500" />}
                                                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{doc.name}</span>
                                                      </div>
                                                      <button className="text-slate-400 hover:text-emerald-600">
                                                          <Download className="w-3.5 h-3.5" />
                                                      </button>
                                                  </div>
                                              ))}
                                          </div>
                                      ) : (
                                          <p className="text-sm text-slate-400 italic">Not Added</p>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </Card>

                      {/* Supplier ID Card */}
                      <Card title="Supplier ID Card">
                          <div className="flex flex-col items-center justify-center p-6 bg-white/50 rounded-xl border border-slate-200 dark:border-slate-700">
                              <div 
                                  ref={idCardRef}
                                  className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 w-full max-w-sm flex flex-col items-center text-center relative overflow-hidden"
                              >
                                  {/* ID Card Header Pattern */}
                                  <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                                  
                                  <div className="w-20 h-20 bg-white rounded-full p-1 shadow-md z-10 mt-4 mb-3 border-4 border-white flex items-center justify-center text-emerald-600">
                                      <Building className="w-10 h-10" />
                                  </div>
                                  
                                  <h3 className="font-bold text-xl text-slate-900 mb-1">{selectedWholesaler.companyName}</h3>
                                  <p className="text-sm font-medium text-slate-500 mb-4">{selectedWholesaler.ownerName}</p>
                                  
                                  <div className="w-full space-y-2 mb-6 text-left bg-slate-50 p-3 rounded-lg border border-slate-100">
                                      <div className="flex items-start gap-2">
                                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                          <p className="text-xs text-slate-600 leading-tight">{displayAddress}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                                          <p className="text-xs text-slate-600">{displayPhone}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                                          <p className="text-xs text-slate-600 font-mono">ID: {selectedWholesaler.id}</p>
                                      </div>
                                  </div>
                                  
                                  <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-2">
                                      <QRCode 
                                          value={selectedWholesaler.id} 
                                          size={120}
                                          bgColor="#ffffff"
                                          fgColor="#000000"
                                          level="Q"
                                      />
                                  </div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-2">
                                      Scan to Login
                                  </p>
                              </div>
                              
                              <button 
                                  onClick={handleDownloadIdCard}
                                  className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-600/20 transition-colors flex items-center justify-center gap-2"
                              >
                                  <Download className="w-4 h-4" /> Download PDF
                              </button>
                          </div>
                      </Card>
                  </div>

                  {/* Right Column: History & Tables */}
                  <div className="lg:col-span-2 space-y-6">
                      <Card title="Assigned Order History">
                        {wholesalerOrders.length > 0 ? (
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-800/30">
                                      <tr>
                                          <th className="px-4 py-3">Order ID</th>
                                          <th className="px-4 py-3">Date</th>
                                          <th className="px-4 py-3">Status</th>
                                          <th className="px-4 py-3 text-right">Amount</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {wholesalerOrders.map(order => (
                                          <tr key={order.id} className="border-b border-gray-200/50 dark:border-gray-800/50 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                                              <td className="px-4 py-3 font-medium text-black">{order.id}</td>
                                              <td className="px-4 py-3 text-slate-500">{order.date.split(' ')[0]}</td>
                                              <td className="px-4 py-3">
                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                      order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                      order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                      'bg-blue-100 text-blue-700'
                                                  }`}>
                                                      {order.status}
                                                  </span>
                                              </td>
                                              <td className="px-4 py-3 text-right font-medium">৳{order.amount.toLocaleString()}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                              <Package className="w-10 h-10 mb-2 opacity-20" />
                              <p className="text-sm">No orders found for this supplier.</p>
                          </div>
                        )}
                      </Card>

                      <Card title="Payout History">
                          {wholesalerPayouts.length > 0 ? (
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                      <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-800/30">
                                          <tr>
                                              <th className="px-4 py-3">Txn ID</th>
                                              <th className="px-4 py-3">Date</th>
                                              <th className="px-4 py-3">Status</th>
                                              <th className="px-4 py-3 text-right">Net Payout</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {wholesalerPayouts.map(payout => (
                                              <tr key={payout.id} className="border-b border-gray-200/50 dark:border-gray-800/50 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                                                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{payout.id}</td>
                                                  <td className="px-4 py-3 text-slate-500">{payout.date}</td>
                                                  <td className="px-4 py-3">
                                                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                          payout.status === 'Settled' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                                                      }`}>
                                                          {payout.status}
                                                      </span>
                                                  </td>
                                                  <td className="px-4 py-3 text-right font-bold text-emerald-600">৳{payout.netPayable.toLocaleString()}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                                  <CreditCard className="w-10 h-10 mb-2 opacity-20" />
                                  <p className="text-sm">No transactions available yet.</p>
                                  <p className="text-xs text-slate-300 mt-1 text-center max-w-xs">Payout records will appear here once the first order cycle is complete.</p>
                              </div>
                          )}
                      </Card>

                      {/* Request Decision History */}
                      <Card title="Decision History" className="overflow-hidden">
                          <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 mb-0 px-6 pt-2">
                                <button
                                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                                        historyTab === 'Accepted' 
                                        ? 'border-emerald-500 text-emerald-600' 
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                                    onClick={() => setHistoryTab('Accepted')}
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    Accepted ({acceptedOrders.length})
                                </button>
                                <button
                                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                                        historyTab === 'Rejected' 
                                        ? 'border-red-500 text-red-600' 
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                                    onClick={() => setHistoryTab('Rejected')}
                                >
                                    <ThumbsDown className="w-4 h-4" />
                                    Rejected ({rejectedOrders.length})
                                </button>
                          </div>
                          
                          <div className="p-0">
                               {historyTab === 'Accepted' && (
                                   acceptedOrders.length > 0 ? (
                                       <table className="w-full text-sm text-left">
                                           <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-800/30">
                                                <tr>
                                                    <th className="px-6 py-3">Order ID</th>
                                                    <th className="px-6 py-3">Accepted Date</th>
                                                    <th className="px-6 py-3">Items</th>
                                                    <th className="px-6 py-3 text-right">Value</th>
                                                </tr>
                                           </thead>
                                           <tbody>
                                               {acceptedOrders.map(order => (
                                                   <tr key={order.id} className="border-b border-gray-200/50 dark:border-gray-800/50 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                                                       <td className="px-6 py-3 font-medium">{order.id}</td>
                                                       <td className="px-6 py-3 text-slate-500">{order.date}</td>
                                                       <td className="px-6 py-3 truncate max-w-[200px]">{order.items}</td>
                                                       <td className="px-6 py-3 text-right font-medium text-emerald-600">৳{order.amount.toLocaleString()}</td>
                                                   </tr>
                                               ))}
                                           </tbody>
                                       </table>
                                   ) : (
                                       <div className="p-8 text-center text-slate-400">
                                           <p>No accepted orders found.</p>
                                       </div>
                                   )
                               )}

                               {historyTab === 'Rejected' && (
                                   rejectedOrders.length > 0 ? (
                                       <table className="w-full text-sm text-left">
                                           <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-800/30">
                                                <tr>
                                                    <th className="px-6 py-3">Order ID</th>
                                                    <th className="px-6 py-3">Date</th>
                                                    <th className="px-6 py-3">Items</th>
                                                    <th className="px-6 py-3 text-right">Value</th>
                                                </tr>
                                           </thead>
                                           <tbody>
                                               {rejectedOrders.map(order => (
                                                   <tr key={order.id} className="border-b border-gray-200/50 dark:border-gray-800/50 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                                                       <td className="px-6 py-3 font-medium text-red-600">{order.id}</td>
                                                       <td className="px-6 py-3 text-slate-500">{order.date}</td>
                                                       <td className="px-6 py-3 truncate max-w-[200px]">{order.items}</td>
                                                       <td className="px-6 py-3 text-right font-medium">৳{order.amount.toLocaleString()}</td>
                                                   </tr>
                                               ))}
                                           </tbody>
                                       </table>
                                   ) : (
                                       <div className="p-8 text-center text-slate-400">
                                           <p>No rejected orders found.</p>
                                       </div>
                                   )
                               )}
                          </div>
                      </Card>
                  </div>
              </div>
          </div>
      );
  }

  // Default List View
  return (
    <div className="space-y-6 animate-fade-in relative">
        {/* Onboard Supplier Modal */}
        {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] border border-gray-200/50 dark:border-gray-800/50">
                     <div className="px-8 py-5 border-b border-gray-200/50 dark:border-gray-800/50 flex justify-between items-center bg-transparent rounded-t-[2rem]">
                         <div>
                            <h3 className="text-xl font-bold text-black">Onboard New Supplier</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Fill in all required business and owner details</p>
                         </div>
                         <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                             <X className="w-6 h-6" />
                         </button>
                     </div>
                     
                     <div className="p-8 overflow-y-auto space-y-8">
                         {/* Section 1: Basic Information */}
                         <div className="space-y-4">
                             <h4 className="text-sm font-bold uppercase text-emerald-600 tracking-wider flex items-center gap-2">
                                 <User className="w-4 h-4" /> Basic Information
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Company Name *</label>
                                     <input 
                                         type="text" 
                                         value={newCompany}
                                         onChange={(e) => setNewCompany(e.target.value)}
                                         placeholder="e.g. Unique Fabrics Ltd"
                                         className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Owner Name *</label>
                                     <input 
                                         type="text" 
                                         value={newOwnerName}
                                         onChange={(e) => setNewOwnerName(e.target.value)}
                                         placeholder="e.g. Rafiqul Islam"
                                         className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Mobile Number *</label>
                                     <input 
                                         type="tel" 
                                         value={newMobile}
                                         onChange={(e) => setNewMobile(e.target.value)}
                                         placeholder="e.g. 01712345678"
                                         className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                                     <input 
                                         type="email" 
                                         value={newEmail}
                                         onChange={(e) => setNewEmail(e.target.value)}
                                         placeholder="e.g. business@example.com"
                                         className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                     />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                                        <select 
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        >
                                            <option value="Apparel">Apparel</option>
                                            <option value="Electronics">Electronics</option>
                                            <option value="FMCG">FMCG</option>
                                            <option value="Footwear">Footwear</option>
                                            <option value="Bags">Bags</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">District</label>
                                        <select 
                                            value={newLocation}
                                            onChange={(e) => setNewLocation(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        >
                                            <option value="Dhaka">Dhaka</option>
                                            <option value="Chittagong">Chittagong</option>
                                            <option value="Sylhet">Sylhet</option>
                                            <option value="Rajshahi">Rajshahi</option>
                                            <option value="Khulna">Khulna</option>
                                        </select>
                                    </div>
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Address (Bangladeshi Format)</label>
                                 <textarea 
                                     rows={2}
                                     value={newAddress}
                                     onChange={(e) => setNewAddress(e.target.value)}
                                     placeholder="e.g. House #15, Road #4, Sector #3, Uttara, Dhaka-1230"
                                     className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                 />
                             </div>
                         </div>

                         <div className="border-t border-slate-100 dark:border-slate-800"></div>

                         {/* Section 2: Financial Information */}
                         <div className="space-y-4">
                             <h4 className="text-sm font-bold uppercase text-emerald-600 tracking-wider flex items-center gap-2">
                                 <CreditCard className="w-4 h-4" /> Financial Information
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Bank Name</label>
                                     <input 
                                         type="text" 
                                         value={newBankName}
                                         onChange={(e) => setNewBankName(e.target.value)}
                                         placeholder="e.g. Dutch-Bangla Bank Ltd"
                                         className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Account Holder Name</label>
                                     <input 
                                         type="text" 
                                         value={newAccName}
                                         onChange={(e) => setNewAccName(e.target.value)}
                                         placeholder="e.g. Unique Fabrics Ltd"
                                         className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Account Number</label>
                                     <input 
                                         type="text" 
                                         value={newAccNumber}
                                         onChange={(e) => setNewAccNumber(e.target.value)}
                                         placeholder="e.g. 101.120.3456"
                                         className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                                     />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Branch Name</label>
                                         <input 
                                             type="text" 
                                             value={newBranch}
                                             onChange={(e) => setNewBranch(e.target.value)}
                                             placeholder="e.g. Gulshan"
                                             className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Routing Number</label>
                                         <input 
                                             type="text" 
                                             value={newRouting}
                                             onChange={(e) => setNewRouting(e.target.value)}
                                             placeholder="e.g. 095123456"
                                             className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                                         />
                                     </div>
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">bKash Number (Optional)</label>
                                     <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-600 font-bold">৳</span>
                                        <input 
                                            type="tel" 
                                            value={newBkash}
                                            onChange={(e) => setNewBkash(e.target.value)}
                                            placeholder="e.g. 01712345678"
                                            className="w-full pl-8 pr-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                                        />
                                     </div>
                                 </div>
                             </div>
                         </div>

                         <div className="border-t border-slate-100 dark:border-slate-800"></div>

                         {/* Section 3: Login Credentials */}
                         <div className="space-y-4">
                             <h4 className="text-sm font-bold uppercase text-emerald-600 tracking-wider flex items-center gap-2">
                                 <ShieldAlert className="w-4 h-4" /> Login Credentials
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Username *</label>
                                     <input 
                                         type="text" 
                                         value={newUsername}
                                         onChange={(e) => setNewUsername(e.target.value)}
                                         placeholder="e.g. supplier123"
                                         className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password *</label>
                                     <input 
                                         type="password" 
                                         value={newPassword}
                                         onChange={(e) => setNewPassword(e.target.value)}
                                         placeholder="Enter password"
                                         className="w-full px-4 py-2.5 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                     />
                                 </div>
                             </div>
                         </div>

                         <div className="border-t border-slate-100 dark:border-slate-800"></div>

                         {/* Section 4: Documents */}
                         <div className="space-y-4">
                             <h4 className="text-sm font-bold uppercase text-emerald-600 tracking-wider flex items-center gap-2">
                                 <FileText className="w-4 h-4" /> Documents (Optional)
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div 
                                    onClick={() => toggleDoc('tradeLicense')}
                                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer group transition-all relative ${uploadedDocs.tradeLicense ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                 >
                                     {uploadedDocs.tradeLicense && <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                     <UploadCloud className={`w-8 h-8 mb-2 ${uploadedDocs.tradeLicense ? 'text-emerald-600' : 'text-slate-300 group-hover:text-emerald-500'}`} />
                                     <p className={`text-sm font-bold ${uploadedDocs.tradeLicense ? 'text-emerald-700' : 'text-slate-600 dark:text-slate-300'}`}>Trade License</p>
                                     <p className="text-xs text-slate-400">{uploadedDocs.tradeLicense ? 'Selected' : 'Click to Upload'}</p>
                                 </div>
                                 <div 
                                    onClick={() => toggleDoc('tin')}
                                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer group transition-all relative ${uploadedDocs.tin ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                 >
                                     {uploadedDocs.tin && <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                     <UploadCloud className={`w-8 h-8 mb-2 ${uploadedDocs.tin ? 'text-emerald-600' : 'text-slate-300 group-hover:text-emerald-500'}`} />
                                     <p className={`text-sm font-bold ${uploadedDocs.tin ? 'text-emerald-700' : 'text-slate-600 dark:text-slate-300'}`}>TIN Certificate</p>
                                     <p className="text-xs text-slate-400">{uploadedDocs.tin ? 'Selected' : 'Click to Upload'}</p>
                                 </div>
                                 <div 
                                    onClick={() => toggleDoc('vat')}
                                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer group transition-all relative ${uploadedDocs.vat ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                 >
                                     {uploadedDocs.vat && <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                     <UploadCloud className={`w-8 h-8 mb-2 ${uploadedDocs.vat ? 'text-emerald-600' : 'text-slate-300 group-hover:text-emerald-500'}`} />
                                     <p className={`text-sm font-bold ${uploadedDocs.vat ? 'text-emerald-700' : 'text-slate-600 dark:text-slate-300'}`}>VAT Registration</p>
                                     <p className="text-xs text-slate-400">{uploadedDocs.vat ? 'Selected' : 'Click to Upload'}</p>
                                 </div>
                                 <div 
                                    onClick={() => toggleDoc('nid')}
                                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer group transition-all relative ${uploadedDocs.nid ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                 >
                                     {uploadedDocs.nid && <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                     <UploadCloud className={`w-8 h-8 mb-2 ${uploadedDocs.nid ? 'text-emerald-600' : 'text-slate-300 group-hover:text-emerald-500'}`} />
                                     <p className={`text-sm font-bold ${uploadedDocs.nid ? 'text-emerald-700' : 'text-slate-600 dark:text-slate-300'}`}>Owner NID Photo</p>
                                     <p className="text-xs text-slate-400">{uploadedDocs.nid ? 'Selected' : 'Front & Back Side'}</p>
                                 </div>
                             </div>
                         </div>
                     </div>

                     <div className="px-8 py-5 border-t border-gray-200/50 dark:border-gray-800/50 bg-transparent rounded-b-[2rem] flex justify-end gap-4">
                         <button 
                            onClick={() => setShowAddModal(false)} 
                            className="px-6 py-2.5 text-slate-500 hover:text-slate-700 font-bold text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                         >
                            Cancel
                         </button>
                         <button 
                             onClick={handleSubmitNewWholesaler}
                             className="px-8 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 flex items-center gap-2 transform active:scale-95 transition-all"
                         >
                             <CheckCircle className="w-4 h-4" /> Complete Onboarding
                         </button>
                     </div>
                </div>
            </div>
        )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Wholesaler Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage {wholesalers.length} suppliers</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
           <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2 font-bold"
           >
             <Plus className="w-4 h-4" /> Onboard Supplier
           </button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search companies..." 
                    className="w-full pl-10 pr-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-700">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">Filters:</span>
                </div>
                
                <select 
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="text-sm bg-white text-black border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                    <option value="All">All Categories</option>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="text-sm bg-white text-black border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                    <option value="All">All Locations</option>
                    {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>

                <button
                    onClick={() => setFilterRecentlyAdded(!filterRecentlyAdded)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 border ${
                        filterRecentlyAdded 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <Clock className="w-4 h-4" /> Recently Added
                </button>

                {(filterCategory !== 'All' || filterLocation !== 'All' || filterRecentlyAdded) && (
                    <button 
                        onClick={() => { setFilterCategory('All'); setFilterLocation('All'); setFilterRecentlyAdded(false); }}
                        className="text-xs text-red-500 hover:text-red-700 font-bold ml-2"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-200/50 dark:border-gray-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Company</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Address & Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-center">Acceptance Rate</th>
                <th className="px-6 py-4 font-medium text-center">Risk Score</th>
                <th className="px-6 py-4 font-medium text-center">Dispatch Speed</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWholesalers.map((wholesaler) => (
                <tr 
                    key={wholesaler.id} 
                    onClick={() => handleWholesalerClick(wholesaler)}
                    className="border-b border-gray-200/50 dark:border-gray-800/50 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                            {wholesaler.companyName.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-semibold text-black group-hover:text-emerald-600 transition-colors">{wholesaler.companyName}</div>
                            <div className="text-xs text-slate-500">ID: {wholesaler.id}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {wholesaler.category}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      <div className="max-w-xs truncate" title={wholesaler.address}>
                          {wholesaler.address}
                      </div>
                      <div className="text-xs text-slate-500">{wholesaler.location || 'Dhaka'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        wholesaler.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        wholesaler.status === 'Suspended' ? 'bg-red-50 text-red-700 border-red-100' : 
                        'bg-yellow-50 text-yellow-700 border-yellow-100'
                    }`}>
                        {wholesaler.status === 'Active' && <CheckCircle className="w-3 h-3" />}
                        {wholesaler.status === 'Suspended' && <XCircle className="w-3 h-3" />}
                        {wholesaler.status === 'Review' && <Clock className="w-3 h-3" />}
                        {wholesaler.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <Star className="w-4 h-4 text-gold-500 fill-current" />
                        {wholesaler.acceptanceRate}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`inline-flex items-center gap-1 font-semibold ${wholesaler.riskScore && wholesaler.riskScore > 50 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {wholesaler.riskScore && wholesaler.riskScore > 50 && <ShieldAlert className="w-4 h-4" />}
                        {wholesaler.riskScore || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <Zap className="w-4 h-4 text-blue-500" />
                        {wholesaler.dispatchSpeed}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};