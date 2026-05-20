import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Search, MoreVertical, ShieldAlert, CheckCircle, XCircle, Plus, X, MapPin, Tag, ArrowLeft, User, Smartphone, Building, FileText, Download, Package, DollarSign, Clock, AlertTriangle, CreditCard, Edit2, Save, ArrowUpDown } from 'lucide-react';
import { Card } from './ui/Card';
import { Retailer } from '../types';
import { MOCK_ORDERS } from '../services/mockData';
import { CATEGORY_STRUCTURE } from '../services/categories';

interface RetailersProps {
    retailers: Retailer[];
    onAddRetailer: (retailer: Retailer) => void;
    onUpdateStatus?: (id: string, status: 'Active' | 'Suspended') => void;
    onUpdateRetailer?: (retailer: Retailer) => void;
}

export const Retailers: React.FC<RetailersProps> = ({ retailers, onAddRetailer, onUpdateStatus, onUpdateRetailer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterDistrict, setFilterDistrict] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('Recently Added');
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editedRetailer, setEditedRetailer] = useState<Retailer | null>(null);
  const idCardRef = useRef<HTMLDivElement>(null);

  const handleDownloadIdCard = async () => {
      if (!idCardRef.current || !selectedRetailer) return;
      
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
          pdf.save(`${selectedRetailer.shopName.replace(/\s+/g, '_')}_ID_Card.pdf`);
      } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Failed to generate PDF. Please try again.');
      }
  };

  // New Retailer Form State
  const [autoGeoTag, setAutoGeoTag] = useState(false);
  const [shopPhoto, setShopPhoto] = useState<File | null>(null);
  const [uploadDocuments, setUploadDocuments] = useState<File[]>([]);
  const [newRetailer, setNewRetailer] = useState<Partial<Retailer> & { house?: string, road?: string, area?: string, thana?: string }>({
      shopName: '',
      ownerName: '',
      mobile: '',
      username: '',
      password: '',
      district: '',
      address: '',
      category: [],
      status: 'Active',
      creditScore: 600,
      totalGMV: 0,
      riskScore: 0,
      bkash: '',
      bankDetails: {
          bankName: '',
          accountName: '',
          accountNumber: '',
          branch: '',
          routing: ''
      },
      documents: [],
      house: '',
      road: '',
      area: '',
      thana: '',
      locationRanking: undefined,
      estimatedMonthlySale: undefined,
      yearsInBusiness: undefined,
      shopType: undefined,
      shopDecorType: undefined,
      shopPhotoUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      let latitude = undefined;
      let longitude = undefined;

      if (autoGeoTag && navigator.geolocation) {
          try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, {
                      enableHighAccuracy: true,
                      timeout: 5000,
                      maximumAge: 0
                  });
              });
              latitude = position.coords.latitude;
              longitude = position.coords.longitude;
          } catch (error) {
              console.error('Geolocation error:', error);
          }
      }
      
      const fullAddress = [
          newRetailer.house ? `House: ${newRetailer.house}` : '',
          newRetailer.road ? `Road: ${newRetailer.road}` : '',
          newRetailer.area ? `${newRetailer.area}` : '',
          newRetailer.thana ? `${newRetailer.thana}` : '',
          newRetailer.district ? `${newRetailer.district}` : ''
      ].filter(Boolean).join(', ');

      const retailer: Retailer = {
          id: `RET-${Math.floor(Math.random() * 10000)}`,
          shopName: newRetailer.shopName || 'New Store',
          ownerName: newRetailer.ownerName || 'Unknown',
          mobile: newRetailer.mobile,
          username: newRetailer.username,
          password: newRetailer.password,
          district: newRetailer.district || 'Dhaka',
          address: fullAddress,
          category: newRetailer.category && newRetailer.category.length > 0 ? newRetailer.category : ['General Store'],
          status: newRetailer.status as 'Active' | 'Pending' | 'Suspended' || 'Active',
          creditScore: newRetailer.creditScore || 600,
          totalGMV: newRetailer.totalGMV || 0,
          riskScore: newRetailer.riskScore || 0,
          createdAt: new Date().toISOString().split('T')[0],
          bkash: newRetailer.bkash,
          bankDetails: newRetailer.bankDetails?.accountNumber ? newRetailer.bankDetails : undefined,
          documents: uploadDocuments.map(file => ({
              name: file.name,
              url: URL.createObjectURL(file),
              status: 'Pending'
          })),
          locationRanking: newRetailer.locationRanking,
          estimatedMonthlySale: newRetailer.estimatedMonthlySale,
          yearsInBusiness: newRetailer.yearsInBusiness,
          shopType: newRetailer.shopType,
          shopDecorType: newRetailer.shopDecorType,
          shopPhotoUrl: shopPhoto ? URL.createObjectURL(shopPhoto) : '',
          latitude,
          longitude
      };
      onAddRetailer(retailer);
      setIsAddModalOpen(false);
      setAutoGeoTag(false);
      setShopPhoto(null);
      setUploadDocuments([]);
      setNewRetailer({
        shopName: '',
        ownerName: '',
        mobile: '',
        username: '',
        password: '',
        district: '',
        address: '',
        category: [],
        status: 'Active',
        creditScore: 600,
        totalGMV: 0,
        riskScore: 0,
        bkash: '',
        bankDetails: {
            bankName: '',
            accountName: '',
            accountNumber: '',
            branch: '',
            routing: ''
        },
        documents: [],
        house: '',
        road: '',
        area: '',
        thana: '',
        locationRanking: undefined,
        estimatedMonthlySale: undefined,
        yearsInBusiness: undefined,
        shopType: undefined,
        shopDecorType: undefined,
        shopPhotoUrl: ''
      });
      setAutoGeoTag(false);
      setShopPhoto(null);
  };

  const handleSuspendClick = () => {
      if (!selectedRetailer) return;
      if (selectedRetailer.status === 'Suspended') {
          // If already suspended, Activate immediately
          if (onUpdateStatus) {
              onUpdateStatus(selectedRetailer.id, 'Active');
              setSelectedRetailer({ ...selectedRetailer, status: 'Active' });
          }
      } else {
          // If active, show confirmation modal
          setShowSuspendModal(true);
      }
  };

  const confirmSuspend = () => {
      if (selectedRetailer && onUpdateStatus) {
          onUpdateStatus(selectedRetailer.id, 'Suspended');
          setSelectedRetailer({ ...selectedRetailer, status: 'Suspended' });
          setShowSuspendModal(false);
      }
  };

  const handleApproveClick = () => {
      if (selectedRetailer && onUpdateStatus) {
          onUpdateStatus(selectedRetailer.id, 'Active');
          setSelectedRetailer({ ...selectedRetailer, status: 'Active' });
      }
  };

  const handleEditClick = () => {
      if (selectedRetailer) {
          setEditedRetailer({ ...selectedRetailer });
          setIsEditing(true);
      }
  };

  const handleSaveEdit = () => {
      if (editedRetailer && onUpdateRetailer) {
          onUpdateRetailer(editedRetailer);
          setSelectedRetailer(editedRetailer);
          setIsEditing(false);
          setEditedRetailer(null);
      }
  };

  const handleCancelEdit = () => {
      setIsEditing(false);
      setEditedRetailer(null);
  };

  // Extract unique categories and districts for filter dropdowns
  const categoriesList = ['All', ...Array.from(new Set(retailers.flatMap(r => r.category || []).filter(Boolean)))];
  const districts = ['All', ...Array.from(new Set(retailers.map(r => r.district).filter(Boolean)))];

  const filteredRetailers = retailers.filter(r => {
      const searchLower = (searchTerm || '').toLowerCase();
      const matchesSearch = (r.shopName || '').toLowerCase().includes(searchLower) || 
                            (r.id || '').toLowerCase().includes(searchLower) ||
                            (r.district || '').toLowerCase().includes(searchLower);
      const matchesCategory = filterCategory === 'All' || (r.category && r.category.includes(filterCategory));
      const matchesDistrict = filterDistrict === 'All' || r.district === filterDistrict;
      return matchesSearch && matchesCategory && matchesDistrict;
  }).sort((a, b) => {
      if (sortBy === 'Recently Added') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'Total GMV') {
          return b.totalGMV - a.totalGMV;
      }
      if (sortBy === 'Recently Ordered') {
          return new Date(b.lastOrderDate || 0).getTime() - new Date(a.lastOrderDate || 0).getTime();
      }
      return 0;
  });

  // Filter orders for the selected retailer
  const retailerOrders = selectedRetailer 
      ? MOCK_ORDERS.filter(o => o.retailerName === selectedRetailer.shopName) 
      : [];

  if (selectedRetailer) {
      return (
          <div className="space-y-6 animate-fade-in pb-10 relative">
              
              {/* Suspend Confirmation Modal */}
              {showSuspendModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800">
                          <div className="p-6 text-center">
                              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <AlertTriangle className="w-8 h-8" />
                              </div>
                              <h3 className="text-xl font-bold text-black mb-2">Suspend {selectedRetailer.shopName}?</h3>
                              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                  This action will <strong>immediately disable ordering</strong> for this retailer. They will not be able to place new orders or request products. Are you sure you want to proceed?
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

              {/* Header */}
              <div className="flex items-center gap-4 mb-2">
                  <button 
                    onClick={() => {
                        setSelectedRetailer(null);
                        setIsEditing(false);
                        setEditedRetailer(null);
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
                                  value={editedRetailer?.shopName || ''} 
                                  onChange={(e) => setEditedRetailer(prev => prev ? ({ ...prev, shopName: e.target.value }) : null)}
                                  className="border border-slate-300 rounded px-2 py-1 text-lg font-bold bg-white text-black"
                              />
                          ) : (
                              selectedRetailer.shopName
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${
                                selectedRetailer.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                selectedRetailer.status === 'Suspended' ? 'bg-red-50 text-red-700 border-red-200' : 
                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>
                                {selectedRetailer.status}
                          </span>
                      </h1>
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <span>ID: {selectedRetailer.id}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedRetailer.district || 'Dhaka'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedRetailer.ownerName}</span>
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
                              {selectedRetailer.status === 'Pending' && (
                                  <button 
                                      onClick={handleApproveClick}
                                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center gap-2"
                                  >
                                      <CheckCircle className="w-4 h-4" /> Approve Retailer
                                  </button>
                              )}
                              
                              <button 
                                  onClick={handleEditClick}
                                  className="px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                              >
                                  <Edit2 className="w-4 h-4" /> Edit Profile
                              </button>

                              <button 
                                onClick={handleSuspendClick}
                                className={`px-4 py-2 border rounded-lg text-sm font-bold shadow-sm transition-colors ${
                                    selectedRetailer.status === 'Suspended' 
                                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                    : 'bg-white border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                }`}
                              >
                                  {selectedRetailer.status === 'Suspended' ? 'Activate Account' : 'Suspend Account'}
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
                          <p className="text-xl font-bold text-black">{retailerOrders.length}</p>
                      </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-charcoal-800">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600">
                          <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Total GMV</p>
                          <p className="text-xl font-bold text-black">৳ {selectedRetailer.totalGMV.toLocaleString()}</p>
                      </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-gold-50 to-white dark:from-gold-900/10 dark:to-charcoal-800">
                      <div className="p-3 bg-gold-100 dark:bg-gold-900/30 rounded-full text-gold-600">
                          <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Credit Score</p>
                          <p className="text-xl font-bold text-black">{selectedRetailer.creditScore}</p>
                      </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-charcoal-800">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600">
                          <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Risk Score</p>
                          <p className={`text-xl font-bold ${selectedRetailer.riskScore > 50 ? 'text-red-600' : 'text-black'}`}>{selectedRetailer.riskScore}</p>
                      </div>
                  </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Profile Info */}
                  <div className="space-y-6 lg:col-span-1">
                      <Card title="Business Profile">
                          <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                  <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                                  <div className="w-full">
                                      <p className="text-xs font-bold text-slate-500 uppercase">Address</p>
                                      {isEditing ? (
                                          <textarea 
                                              rows={3}
                                              value={editedRetailer?.address || ''}
                                              onChange={(e) => setEditedRetailer(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                                              className="w-full mt-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-black"
                                          />
                                      ) : (
                                          <p className={`text-sm ${!selectedRetailer.address ? 'text-slate-400 italic' : 'text-slate-700 dark:text-slate-300'}`}>
                                              {selectedRetailer.address || "Not Added"}
                                          </p>
                                      )}
                                      
                                      <div className="mt-2">
                                          <p className="text-xs font-bold text-slate-500 uppercase">Contact</p>
                                          <div className="flex items-center gap-2 mt-1">
                                              <Smartphone className="w-3 h-3 text-slate-400" /> 
                                              {isEditing ? (
                                                  <input 
                                                      type="text" 
                                                      value={editedRetailer?.mobile || ''}
                                                      onChange={(e) => setEditedRetailer(prev => prev ? ({ ...prev, mobile: e.target.value }) : null)}
                                                      className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                                  />
                                              ) : (
                                                  <span className={!selectedRetailer.mobile ? 'text-slate-400 italic' : 'text-sm text-slate-700 dark:text-slate-300'}>{selectedRetailer.mobile || "Not Added"}</span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                              <User className="w-3 h-3 text-slate-400" /> 
                                              {isEditing ? (
                                                  <input 
                                                      type="text" 
                                                      value={editedRetailer?.ownerName || ''}
                                                      onChange={(e) => setEditedRetailer(prev => prev ? ({ ...prev, ownerName: e.target.value }) : null)}
                                                      className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                                  />
                                              ) : (
                                                  <span className={!selectedRetailer.ownerName ? 'text-slate-400 italic' : 'text-sm text-slate-700 dark:text-slate-300'}>{selectedRetailer.ownerName || "Not Added"}</span>
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
                                                  value={editedRetailer?.bankDetails?.bankName || ''}
                                                  onChange={(e) => setEditedRetailer(prev => prev ? ({ ...prev, bankDetails: { ...prev.bankDetails!, bankName: e.target.value } }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                              />
                                              <input 
                                                  type="text" 
                                                  placeholder="Account Name"
                                                  value={editedRetailer?.bankDetails?.accountName || ''}
                                                  onChange={(e) => setEditedRetailer(prev => prev ? ({ ...prev, bankDetails: { ...prev.bankDetails!, accountName: e.target.value } }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                              />
                                              <input 
                                                  type="text" 
                                                  placeholder="Account Number"
                                                  value={editedRetailer?.bankDetails?.accountNumber || ''}
                                                  onChange={(e) => setEditedRetailer(prev => prev ? ({ ...prev, bankDetails: { ...prev.bankDetails!, accountNumber: e.target.value } }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                              />
                                              <input 
                                                  type="text" 
                                                  placeholder="Branch"
                                                  value={editedRetailer?.bankDetails?.branch || ''}
                                                  onChange={(e) => setEditedRetailer(prev => prev ? ({ ...prev, bankDetails: { ...prev.bankDetails!, branch: e.target.value } }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                              />
                                          </div>
                                      ) : (
                                          selectedRetailer.bankDetails ? (
                                              <>
                                                  <p className="text-sm font-semibold text-black">{selectedRetailer.bankDetails.bankName || <span className="text-slate-400 font-normal italic">Bank Name Not Added</span>}</p>
                                                  <p className="text-xs text-slate-500">{selectedRetailer.bankDetails.accountName}</p>
                                                  <p className="text-xs text-slate-500 font-mono mt-1">{selectedRetailer.bankDetails.accountNumber}</p>
                                                  <p className="text-xs text-slate-500 mt-0.5">{selectedRetailer.bankDetails.branch}</p>
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
                                                  value={editedRetailer?.bkash || ''}
                                                  onChange={(e) => setEditedRetailer(prev => prev ? ({ ...prev, bkash: e.target.value }) : null)}
                                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-full bg-white text-black"
                                              />
                                          ) : (
                                              <span className={`font-mono ${!selectedRetailer.bkash ? 'text-slate-400 italic' : 'text-slate-700 dark:text-slate-300'}`}>
                                                  {selectedRetailer.bkash || 'Not Added'}
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-start gap-3">
                                  <FileText className="w-4 h-4 text-slate-400 mt-1" />
                                  <div className="w-full">
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Documents</p>
                                      {selectedRetailer.documents && selectedRetailer.documents.length > 0 ? (
                                          <div className="space-y-2">
                                              {selectedRetailer.documents.map((doc, i) => (
                                                  <div key={i} className="flex justify-between items-center p-2 bg-white/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                                      <div className="flex items-center gap-2">
                                                          {doc.status === 'Verified' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-yellow-500" />}
                                                          <div className="flex flex-col">
                                                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{doc.type}</span>
                                                              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{doc.name}</span>
                                                          </div>
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

                      <Card title="Analytical Details">
                          <div className="space-y-4">
                              {selectedRetailer.shopPhotoUrl && (
                                  <div className="mb-4">
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Shop Photo</p>
                                      <img 
                                          src={selectedRetailer.shopPhotoUrl} 
                                          alt="Shop" 
                                          className="w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                                          referrerPolicy="no-referrer"
                                      />
                                  </div>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase">Location Ranking</p>
                                      <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRetailer.locationRanking || 'N/A'}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase">Monthly Sale</p>
                                      <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRetailer.estimatedMonthlySale || 'N/A'}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase">Years in Business</p>
                                      <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRetailer.yearsInBusiness || 'N/A'}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase">Shop Type</p>
                                      <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRetailer.shopType || 'N/A'}</p>
                                  </div>
                                  <div className="col-span-2">
                                      <p className="text-xs font-bold text-slate-500 uppercase">Shop Decor</p>
                                      <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRetailer.shopDecorType || 'N/A'}</p>
                                  </div>
                                  {(selectedRetailer.latitude && selectedRetailer.longitude) && (
                                      <div className="col-span-2">
                                          <p className="text-xs font-bold text-slate-500 uppercase">Geo-Coordinates</p>
                                          <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                              Lat: {selectedRetailer.latitude.toFixed(6)}, Lng: {selectedRetailer.longitude.toFixed(6)}
                                          </p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </Card>

                      <Card title="Retailer ID Card">
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
                                  
                                  <h3 className="font-bold text-xl text-slate-900 mb-1">{selectedRetailer.shopName}</h3>
                                  <p className="text-sm font-medium text-slate-500 mb-4">{selectedRetailer.ownerName}</p>
                                  
                                  <div className="w-full space-y-2 mb-6 text-left bg-slate-50 p-3 rounded-lg border border-slate-100">
                                      <div className="flex items-start gap-2">
                                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                          <p className="text-xs text-slate-600 leading-tight">{selectedRetailer.address || 'Address not provided'}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                                          <p className="text-xs text-slate-600">{selectedRetailer.mobile || 'Phone not provided'}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                                          <p className="text-xs text-slate-600 font-mono">ID: {selectedRetailer.id}</p>
                                      </div>
                                  </div>
                                  
                                  <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-2">
                                      <QRCode 
                                          value={selectedRetailer.id} 
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

                  {/* Right Column: Order History */}
                  <div className="lg:col-span-2 space-y-6">
                      <Card title="Order History">
                        {retailerOrders.length > 0 ? (
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-slate-500 uppercase bg-white">
                                      <tr>
                                          <th className="px-4 py-3">Order ID</th>
                                          <th className="px-4 py-3">Date</th>
                                          <th className="px-4 py-3">Wholesaler</th>
                                          <th className="px-4 py-3">Status</th>
                                          <th className="px-4 py-3 text-right">Amount</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {retailerOrders.map(order => (
                                          <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                              <td className="px-4 py-3 font-medium text-black">{order.id}</td>
                                              <td className="px-4 py-3 text-slate-500">{order.date.split(' ')[0]}</td>
                                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{order.wholesalerName}</td>
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
                              <p className="text-sm">No orders found for this retailer.</p>
                          </div>
                        )}
                      </Card>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Retailer Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage {retailers.length} retailers across {districts.length - 1} districts</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
           <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2 justify-center"
            >
             <Plus className="w-4 h-4" /> Add Retailer
           </button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search by ID, Name or District..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[180px]">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                    >
                        {categoriesList.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
                    </select>
                </div>

                <div className="relative min-w-[180px]">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={filterDistrict}
                      onChange={(e) => setFilterDistrict(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                    >
                        {districts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>)}
                    </select>
                </div>

                <div className="relative min-w-[180px]">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                    >
                        <option value="Recently Added">Recently Added</option>
                        <option value="Total GMV">Total GMV</option>
                        <option value="Recently Ordered">Recently Ordered</option>
                    </select>
                </div>

                {(filterCategory !== 'All' || filterDistrict !== 'All' || searchTerm || sortBy !== 'Recently Added') && (
                    <button 
                        onClick={() => {
                            setFilterCategory('All');
                            setFilterDistrict('All');
                            setSearchTerm('');
                            setSortBy('Recently Added');
                        }}
                        className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <X className="w-4 h-4" /> Clear Filters
                    </button>
                )}
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Retailer</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Full Address</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Credit Score</th>
                <th className="px-6 py-4 font-medium text-right">Risk Score</th>
                <th className="px-6 py-4 font-medium text-right">Total GMV</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRetailers.map((retailer) => (
                <tr 
                    key={retailer.id} 
                    onClick={() => setSelectedRetailer(retailer)}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                            {retailer.shopName.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-semibold text-black group-hover:text-emerald-600 transition-colors">{retailer.shopName}</div>
                            <div className="text-xs text-slate-500">ID: {retailer.id}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {retailer.category?.join(', ') || 'N/A'}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={`${retailer.address}, ${retailer.district}`}>
                      {retailer.address ? `${retailer.address}, ${retailer.district}` : retailer.district}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        retailer.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        retailer.status === 'Suspended' ? 'bg-red-50 text-red-700 border-red-100' : 
                        'bg-yellow-50 text-yellow-700 border-yellow-100'
                    }`}>
                        {retailer.status === 'Active' && <CheckCircle className="w-3 h-3" />}
                        {retailer.status === 'Suspended' && <XCircle className="w-3 h-3" />}
                        {retailer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-block text-slate-700 dark:text-slate-300 font-medium">{retailer.creditScore}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`inline-flex items-center gap-1 font-semibold ${retailer.riskScore > 50 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {retailer.riskScore > 50 && <ShieldAlert className="w-4 h-4" />}
                        {retailer.riskScore}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-black">
                    ৳{retailer.totalGMV.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRetailer(retailer);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Retailer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-black">Add New Retailer</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shop Name *</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                      value={newRetailer.shopName}
                      onChange={e => setNewRetailer({...newRetailer, shopName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Owner Name *</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                      value={newRetailer.ownerName}
                      onChange={e => setNewRetailer({...newRetailer, ownerName: e.target.value})}
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mobile Number *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="01XXXXXXXXX"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                      value={newRetailer.mobile}
                      onChange={e => setNewRetailer({...newRetailer, mobile: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categories *</label>
                    <div className="w-full max-h-32 overflow-y-auto px-3 py-2 bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 outline-none text-black space-y-2">
                        {CATEGORY_STRUCTURE.map(cat => (
                            <label key={cat.name} className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                    checked={newRetailer.category?.includes(cat.name) || false}
                                    onChange={(e) => {
                                        const currentCategories = newRetailer.category || [];
                                        if (e.target.checked) {
                                            setNewRetailer({ ...newRetailer, category: [...currentCategories, cat.name] });
                                        } else {
                                            setNewRetailer({ ...newRetailer, category: currentCategories.filter(c => c !== cat.name) });
                                        }
                                    }}
                                />
                                <span className="text-sm">{cat.name}</span>
                            </label>
                        ))}
                    </div>
                  </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-semibold text-black mb-3">Login Credentials</h3>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.username || ''}
                          onChange={e => setNewRetailer({...newRetailer, username: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                        <input 
                          type="password" 
                          required
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.password || ''}
                          onChange={e => setNewRetailer({...newRetailer, password: e.target.value})}
                        />
                      </div>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Status</label>
                    <select 
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                      value={newRetailer.status}
                      onChange={e => setNewRetailer({...newRetailer, status: e.target.value as 'Active' | 'Pending' | 'Suspended'})}
                    >
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Suspended">Suspended</option>
                    </select>
                  </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-semibold text-black mb-3">Address Details</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">House (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="House #"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.house || ''}
                          onChange={e => setNewRetailer({...newRetailer, house: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Road (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="Road #"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.road || ''}
                          onChange={e => setNewRetailer({...newRetailer, road: e.target.value})}
                        />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Area - Bazar *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Area / Bazar"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.area || ''}
                          onChange={e => setNewRetailer({...newRetailer, area: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Thana *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Thana"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.thana || ''}
                          onChange={e => setNewRetailer({...newRetailer, thana: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">District *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="District"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.district || ''}
                          onChange={e => setNewRetailer({...newRetailer, district: e.target.value})}
                        />
                      </div>
                  </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-semibold text-black mb-3">Analytical Details (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location Ranking</label>
                        <select 
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.locationRanking || ''}
                          onChange={e => setNewRetailer({...newRetailer, locationRanking: e.target.value as Retailer['locationRanking']})}
                        >
                            <option value="">Select Ranking</option>
                            <option value="Main Goli (5 star)">Main Goli (5 star)</option>
                            <option value="Near Main Goli (4 star)">Near Main Goli (4 star)</option>
                            <option value="Far from main goli (3 star)">Far from main goli (3 star)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estimated Monthly Sale</label>
                        <select 
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.estimatedMonthlySale || ''}
                          onChange={e => setNewRetailer({...newRetailer, estimatedMonthlySale: e.target.value as Retailer['estimatedMonthlySale']})}
                        >
                            <option value="">Select Sale Level</option>
                            <option value="Excellent">Excellent</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Years in Business</label>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="Years"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.yearsInBusiness || ''}
                          onChange={e => setNewRetailer({...newRetailer, yearsInBusiness: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shop Type</label>
                        <select 
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.shopType || ''}
                          onChange={e => setNewRetailer({...newRetailer, shopType: e.target.value as Retailer['shopType']})}
                        >
                            <option value="">Select Type</option>
                            <option value="Big">Big</option>
                            <option value="Medium">Medium</option>
                            <option value="Small">Small</option>
                        </select>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shop Decor Type</label>
                        <select 
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.shopDecorType || ''}
                          onChange={e => setNewRetailer({...newRetailer, shopDecorType: e.target.value as Retailer['shopDecorType']})}
                        >
                            <option value="">Select Decor</option>
                            <option value="Very Nice">Very Nice</option>
                            <option value="Nice">Nice</option>
                            <option value="Less Nice">Less Nice</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shop Photo</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black text-sm"
                          onChange={e => setShopPhoto(e.target.files?.[0] || null)}
                        />
                      </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                      <input 
                        type="checkbox" 
                        id="autoGeoTag"
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        checked={autoGeoTag}
                        onChange={e => setAutoGeoTag(e.target.checked)}
                      />
                      <label htmlFor="autoGeoTag" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Auto geo-tag location using device GPS
                      </label>
                  </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-semibold text-black mb-3">Financial Details (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">bKash Number</label>
                        <input 
                          type="tel" 
                          placeholder="01XXXXXXXXX"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.bkash}
                          onChange={e => setNewRetailer({...newRetailer, bkash: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.bankDetails?.bankName}
                          onChange={e => setNewRetailer({
                              ...newRetailer, 
                              bankDetails: { ...newRetailer.bankDetails!, bankName: e.target.value }
                          })}
                        />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.bankDetails?.accountNumber}
                          onChange={e => setNewRetailer({
                              ...newRetailer, 
                              bankDetails: { ...newRetailer.bankDetails!, accountNumber: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch Name</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                          value={newRetailer.bankDetails?.branch}
                          onChange={e => setNewRetailer({
                              ...newRetailer, 
                              bankDetails: { ...newRetailer.bankDetails!, branch: e.target.value }
                          })}
                        />
                      </div>
                  </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-semibold text-black mb-3">Documents (Optional)</h3>
                  <div className="space-y-3">
                      <div 
                          onClick={() => document.getElementById('doc-upload')?.click()}
                          className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                          <input 
                              type="file" 
                              id="doc-upload"
                              multiple
                              className="hidden"
                              onChange={e => {
                                  if (e.target.files) {
                                      setUploadDocuments(prev => [...prev, ...Array.from(e.target.files!)]);
                                  }
                              }}
                          />
                          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                              Upload Trade License, TIN, VAT or NID
                          </p>
                          <p className="text-xs text-slate-400 mt-1">Click to browse or drag and drop multiple files</p>
                      </div>

                      {uploadDocuments.length > 0 && (
                          <div className="grid grid-cols-1 gap-2">
                              {uploadDocuments.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                          <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                                              {file.name}
                                          </span>
                                          <span className="text-[10px] text-slate-400 shrink-0">
                                              ({(file.size / 1024).toFixed(1)} KB)
                                          </span>
                                      </div>
                                      <button 
                                          type="button"
                                          onClick={() => setUploadDocuments(prev => prev.filter((_, i) => i !== index))}
                                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                      >
                                          <X className="w-4 h-4" />
                                      </button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Create Retailer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};