import React, { useState } from 'react';
import { Retailer } from '../src/types/domain';
import { Save, User, MapPin, Phone, CreditCard, Building, FileText, Lock, Upload, X, Eye, EyeOff, CheckCircle, Clock } from 'lucide-react';

import { CATEGORY_STRUCTURE } from '../services/categories';

interface RetailerProfileProps {
  profile: Retailer;
  onUpdateProfile: (updatedProfile: Retailer) => void;
}

export const RetailerProfile: React.FC<RetailerProfileProps> = ({ profile, onUpdateProfile }) => {
  const [formData, setFormData] = useState<Retailer>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<'Trade License' | 'TIN' | 'VAT' | 'NID'>('Trade License');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        
        setFormData(prev => ({
            ...prev,
            documents: [
                ...(prev.documents || []),
                {
                    name: file.name,
                    type: uploadDocType,
                    status: 'Pending',
                    url: url
                }
            ]
        }));
        setIsEditing(true);
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
        ...prev,
        documents: prev.documents?.filter((_, i) => i !== index)
    }));
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const confirmSave = () => {
    onUpdateProfile(formData);
    setIsEditing(false);
    setShowConfirmModal(false);
  };

  return (
    <div className="p-4 pb-24 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Profile</h2>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Edit Profile
          </button>
        ) : (
          <button 
            onClick={() => {
                setFormData(profile);
                setIsEditing(false);
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <User className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Owner Name</label>
                    <input 
                        type="text" 
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-colors disabled:opacity-70 text-black"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile Number</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            name="mobile"
                            value={formData.mobile || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full pl-10 pr-3 py-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-colors disabled:opacity-70 text-black"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Shop Info */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Building className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white">Shop Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shop Name</label>
                    <input 
                        type="text" 
                        name="shopName"
                        value={formData.shopName}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-colors disabled:opacity-70 text-black"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                    {isEditing ? (
                        <select 
                            multiple
                            name="category"
                            value={Array.isArray(formData.category) ? formData.category : (formData.category ? [formData.category] : [])}
                            onChange={e => {
                                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                setFormData({...formData, category: selectedOptions});
                            }}
                            className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-colors text-black min-h-[100px]"
                        >
                            {CATEGORY_STRUCTURE.map(cat => (
                                <option key={cat.name} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    ) : (
                        <input 
                            type="text" 
                            value={Array.isArray(formData.category) ? formData.category.join(', ') : formData.category}
                            disabled
                            className="w-full p-3 bg-white rounded-xl border border-gray-200 outline-none disabled:opacity-70 text-black"
                        />
                    )}
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            name="address"
                            value={formData.address || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full pl-10 pr-3 py-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-colors disabled:opacity-70 text-black"
                        />
                    </div>
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">District</label>
                    <input 
                        type="text" 
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-colors disabled:opacity-70 text-black"
                    />
                </div>
            </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white">Payment Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">bKash Number</label>
                    <input 
                        type="text" 
                        name="bkash"
                        value={formData.bkash || ''}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-colors disabled:opacity-70 text-black"
                    />
                </div>
            </div>
        </div>

        {/* Business Documents */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white">Business Documents</h3>
            </div>
            
            <div className="space-y-4">
                {formData.documents && formData.documents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {formData.documents.map((doc, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    {doc.status === 'Verified' ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    ) : doc.status === 'Rejected' ? (
                                        <X className="w-4 h-4 text-red-500" />
                                    ) : (
                                        <Clock className="w-4 h-4 text-yellow-500" />
                                    )}
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">{doc.type}</p>
                                        <p className="text-xs text-gray-500">{doc.name}</p>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => removeDocument(index)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">No documents uploaded yet.</p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <select
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value as 'Trade License' | 'TIN' | 'VAT' | 'NID')}
                        className="p-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none text-black text-sm"
                    >
                        <option value="Trade License">Trade License</option>
                        <option value="TIN">TIN Certificate</option>
                        <option value="VAT">VAT Registration</option>
                        <option value="NID">NID Copy</option>
                    </select>
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Upload className="w-4 h-4" />
                        Upload {uploadDocType}
                        <input 
                            type="file" 
                            className="hidden" 
                            onChange={handleFileUpload}
                            accept="image/*,.pdf"
                        />
                    </label>
                </div>
            </div>
        </div>

        {/* Account Security */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Lock className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white">Account Security</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">User ID</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            name="username"
                            value={formData.username || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            placeholder="Enter User ID"
                            className="w-full pl-10 pr-3 py-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-colors disabled:opacity-70 text-black"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-10 py-3 bg-white rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-colors disabled:opacity-70 text-black"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {isEditing && (
            <div className="fixed bottom-20 left-0 right-0 p-4 bg-white dark:bg-[#1E1E1E] border-t border-gray-100 dark:border-gray-800 z-40 flex justify-end gap-3 max-w-5xl mx-auto">
                <button 
                    type="button"
                    onClick={() => {
                        setFormData(profile);
                        setIsEditing(false);
                    }}
                    className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Save Changes
                </button>
            </div>
        )}
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl max-w-md w-full p-6 shadow-xl animate-scale-in">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Confirm Changes</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Are you sure you want to save these changes to your profile?
                </p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmSave}
                        className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Confirm & Save
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
