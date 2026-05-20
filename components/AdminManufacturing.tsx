import React, { useState } from 'react';
import { Card } from './ui/Card';
import { ManufacturingOrder, ManufacturingSample } from '../types';
import { Search, Eye, X, Plus, Package, Image as ImageIcon, Trash2, Edit2, Save } from 'lucide-react';
import { AdminConfiguratorSettings } from './AdminConfiguratorSettings';

interface AdminManufacturingProps {
    orders: ManufacturingOrder[];
    onUpdateStatus: (orderId: string, status: ManufacturingOrder['status'], note?: string) => void;
    onUpdateOrder: (order: ManufacturingOrder) => void;
    onDeleteOrder: (orderId: string) => void;
    samples: ManufacturingSample[];
    onAddSample: (sample: ManufacturingSample) => void;
    custom3DModel: string | null;
    onUpdateCustomModel: (model: string | null) => void;
    fabricGSMOptions: { id: number; gsm: string; price: number }[];
    onUpdateFabricGSMOptions: (options: { id: number; gsm: string; price: number }[]) => void;
}

export const AdminManufacturing: React.FC<AdminManufacturingProps> = ({ orders, onUpdateStatus, onUpdateOrder, onDeleteOrder, samples, onAddSample, custom3DModel, onUpdateCustomModel, fabricGSMOptions, onUpdateFabricGSMOptions }) => {
    const [activeTab, setActiveTab] = useState<'orders' | 'samples' | 'configurator'>('orders');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
    const [statusNote, setStatusNote] = useState('');
    
    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<ManufacturingOrder>>({});

    const handleSelectOrder = (order: ManufacturingOrder) => {
        setSelectedOrder(order);
        setEditForm(order);
        setIsEditing(false);
    };

    const handleSaveEdit = () => {
        if (selectedOrder && editForm) {
            onUpdateOrder({ ...selectedOrder, ...editForm } as ManufacturingOrder);
            setIsEditing(false);
            setSelectedOrder({ ...selectedOrder, ...editForm } as ManufacturingOrder);
        }
    };

    const handleDelete = () => {
        if (selectedOrder && window.confirm('Are you sure you want to delete this order?')) {
            onDeleteOrder(selectedOrder.id);
            setSelectedOrder(null);
        }
    };
    
    // Sample Form State
    const [showAddSample, setShowAddSample] = useState(false);
    const [newSample, setNewSample] = useState<Partial<ManufacturingSample>>({
        name: '',
        category: '',
        price: 0,
        moq: 0,
        description: '',
        image: '',
        specifications: []
    });
    const [specInput, setSpecInput] = useState('');

    const searchLower = (searchTerm || '').toLowerCase();
    const filteredOrders = orders.filter(o => 
        (o.id || '').toLowerCase().includes(searchLower) || 
        (o.retailerName || '').toLowerCase().includes(searchLower) ||
        (o.brandName || '').toLowerCase().includes(searchLower)
    );

    const filteredSamples = samples.filter(s =>
        (s.name || '').toLowerCase().includes(searchLower) ||
        (s.category || '').toLowerCase().includes(searchLower)
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Requested': return 'bg-yellow-100 text-yellow-700';
            case 'Quotation Sent': return 'bg-blue-100 text-blue-700';
            case 'Production': return 'bg-purple-100 text-purple-700';
            case 'Quality Check': return 'bg-orange-100 text-orange-700';
            case 'Completed': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handleStatusUpdate = (newStatus: ManufacturingOrder['status']) => {
        if (selectedOrder) {
            onUpdateStatus(selectedOrder.id, newStatus, statusNote);
            setSelectedOrder(null);
            setStatusNote('');
        }
    };

    const handleAddSpec = () => {
        if (specInput.trim()) {
            setNewSample(prev => ({
                ...prev,
                specifications: [...(prev.specifications || []), specInput.trim()]
            }));
            setSpecInput('');
        }
    };

    const handleRemoveSpec = (index: number) => {
        setNewSample(prev => ({
            ...prev,
            specifications: prev.specifications?.filter((_, i) => i !== index)
        }));
    };

    const handleSubmitSample = (e: React.FormEvent) => {
        e.preventDefault();
        const sample: ManufacturingSample = {
            id: `SMP-${Date.now()}`,
            name: newSample.name || '',
            category: newSample.category || '',
            price: Number(newSample.price) || 0,
            moq: Number(newSample.moq) || 0,
            description: newSample.description || '',
            image: newSample.image || 'https://images.unsplash.com/photo-1553456558-aff63285bdd1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
            specifications: newSample.specifications || []
        };
        onAddSample(sample);
        setShowAddSample(false);
        setNewSample({
            name: '',
            category: '',
            price: 0,
            moq: 0,
            description: '',
            image: '',
            specifications: []
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Add Sample Modal */}
            {showAddSample && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-xl font-bold text-black">Add Sample Product</h3>
                            <button 
                                onClick={() => setShowAddSample(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmitSample} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-3 py-2 bg-white text-black border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newSample.name}
                                        onChange={e => setNewSample({...newSample, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                                    <select 
                                        required
                                        className="w-full px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newSample.category}
                                        onChange={e => setNewSample({...newSample, category: e.target.value})}
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Apparel">Apparel</option>
                                        <option value="Footwear">Footwear</option>
                                        <option value="Accessories">Accessories</option>
                                        <option value="Home Textile">Home Textile</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price (৳)</label>
                                    <input 
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full px-3 py-2 bg-white text-black border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newSample.moq}
                                        onChange={e => setNewSample({...newSample, moq: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Minimum Order Qty (MOQ)</label>
                                     <input 
                                         type="number"
                                         required
                                         min="1"
                                         className="w-full px-3 py-2 bg-white text-black border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                         value={newSample.moq}
                                         onChange={e => setNewSample({...newSample, moq: Number(e.target.value)})}
                                     />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea 
                                    required
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newSample.description}
                                    onChange={e => setNewSample({...newSample, description: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image URL</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="url" 
                                        placeholder="https://..."
                                        className="w-full px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newSample.image}
                                        onChange={e => setNewSample({...newSample, image: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Specifications</label>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add spec (e.g. 100% Cotton)"
                                        className="flex-1 px-3 py-2 bg-white text-black border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={specInput}
                                        onChange={e => setSpecInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSpec())}
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleAddSpec}
                                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {newSample.specifications?.map((spec, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                            {spec}
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveSpec(idx)}
                                                className="ml-1.5 text-emerald-600 hover:text-emerald-900"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddSample(false)}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-lg shadow-emerald-600/20"
                                >
                                    Add Sample Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-4">
                                {selectedOrder.retailerImage ? (
                                    <img src={selectedOrder.retailerImage} alt={selectedOrder.retailerName} className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-lg">
                                        {selectedOrder.retailerName.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xl font-bold text-black flex items-center gap-2">
                                        {selectedOrder.brandName}
                                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>
                                            {selectedOrder.status}
                                        </span>
                                    </h3>
                                    <p className="text-sm text-slate-500">Order #{selectedOrder.id} • {selectedOrder.retailerName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isEditing ? (
                                    <>
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            title="Edit Order"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={handleDelete}
                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Order"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setIsEditing(false)}
                                            className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSaveEdit}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm"
                                        >
                                            <Save className="w-4 h-4" /> Save
                                        </button>
                                    </>
                                )}
                                <button 
                                    onClick={() => setSelectedOrder(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Product Image & Basic Info */}
                            <div className="space-y-6">
                                <div className="aspect-square w-full bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden relative group">
                                    {selectedOrder.productImage ? (
                                        <img src={selectedOrder.productImage} alt="Product" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-2">
                                            <ImageIcon className="w-12 h-12 opacity-50" />
                                            <span className="text-sm">No Product Image</span>
                                        </div>
                                    )}
                                    {isEditing && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <input 
                                                type="text" 
                                                placeholder="Image URL" 
                                                className="w-3/4 px-3 py-2 bg-white rounded-lg text-sm"
                                                value={editForm.productImage || ''}
                                                onChange={e => setEditForm({...editForm, productImage: e.target.value})}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-black mb-3">Order Details</h4>
                                    <div className="bg-white/50 p-4 rounded-xl text-sm space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Category</span>
                                            {isEditing ? (
                                                <input 
                                                    className="px-2 py-1 border rounded text-right w-32"
                                                    value={editForm.productCategory || ''}
                                                    onChange={e => setEditForm({...editForm, productCategory: e.target.value})}
                                                />
                                            ) : (
                                                <span className="font-medium text-black">{selectedOrder.productCategory}</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Quantity</span>
                                            {isEditing ? (
                                                <input 
                                                    type="number" min="0"
                                                    className="px-2 py-1 border rounded text-right w-24"
                                                    value={editForm.quantity || 0}
                                                    onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})}
                                                />
                                            ) : (
                                                <span className="font-medium text-black">{selectedOrder.quantity} Units</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Target Price</span>
                                            {isEditing ? (
                                                <input 
                                                    type="number" min="0"
                                                    className="px-2 py-1 border rounded text-right w-24"
                                                    value={editForm.targetPricePerUnit || 0}
                                                    onChange={e => setEditForm({...editForm, targetPricePerUnit: Number(e.target.value)})}
                                                />
                                            ) : (
                                                <span className="font-medium text-black">৳{selectedOrder.targetPricePerUnit}/unit</span>
                                            )}
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-600 flex justify-between items-center font-bold">
                                            <span className="text-slate-700 dark:text-slate-300">Total Value</span>
                                            <span className="text-emerald-600">৳{(selectedOrder.quantity * selectedOrder.targetPricePerUnit).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Specs & Timeline */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-black mb-2">Specifications</h4>
                                    {isEditing ? (
                                        <textarea 
                                            className="w-full px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                            rows={4}
                                            value={editForm.specifications || ''}
                                            onChange={e => setEditForm({...editForm, specifications: e.target.value})}
                                        />
                                    ) : (
                                        <p className="text-sm text-slate-600 dark:text-slate-300 bg-white/50 p-4 rounded-xl leading-relaxed">
                                            {selectedOrder.specifications}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-black mb-2">Update Status</h4>
                                    <div className="space-y-3 bg-white border border-slate-100 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                                        <textarea
                                            className="w-full px-3 py-2 bg-white text-black border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                            placeholder="Add a note (e.g. 'Fabric sourced', 'QC passed')..."
                                            rows={2}
                                            value={statusNote}
                                            onChange={(e) => setStatusNote(e.target.value)}
                                        ></textarea>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Quotation Sent', 'Production', 'Quality Check', 'Completed'].map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => handleStatusUpdate(status as ManufacturingOrder['status'])}
                                                    disabled={selectedOrder.status === status}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                                                        selectedOrder.status === status 
                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                                                    }`}
                                                >
                                                    Mark as {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-black mb-2">Timeline</h4>
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2 relative pl-2">
                                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                                        {selectedOrder.updates?.map((update, idx) => (
                                            <div key={idx} className="flex gap-4 text-xs relative">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 z-10 mt-1"></div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-bold text-black">{update.status}</span>
                                                        <span className="text-slate-400 text-[10px]">{update.date}</span>
                                                    </div>
                                                    <p className="text-slate-500 bg-white/30 p-2 rounded-lg">{update.note}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {/* ... (Header content remains same) ... */}
                <div>
                    <h1 className="text-2xl font-bold text-black">Manufacturing</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage custom production requests and samples</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder={activeTab === 'orders' ? "Search orders..." : "Search samples..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                        />
                    </div>
                    {activeTab === 'samples' && (
                        <button 
                            onClick={() => setShowAddSample(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-lg shadow-emerald-600/20 transition-all whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Add Sample
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200 dark:border-slate-700">
                {/* ... (Tabs logic remains same) ... */}
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${
                        activeTab === 'orders' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    Production Orders
                    {activeTab === 'orders' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('samples')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${
                        activeTab === 'samples' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    Sample Products
                    {activeTab === 'samples' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('configurator')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${
                        activeTab === 'configurator' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    Configurator Settings
                    {activeTab === 'configurator' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                    )}
                </button>
            </div>

            {activeTab === 'orders' ? (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Order ID</th>
                                    <th className="px-6 py-4">Brand & Retailer</th>
                                    <th className="px-6 py-4">Product Details</th>
                                    <th className="px-6 py-4">Target Price</th>
                                    <th className="px-6 py-4">Request Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                            No manufacturing orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr 
                                            key={order.id} 
                                            onClick={() => handleSelectOrder(order)}
                                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4 font-mono text-slate-500">{order.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {order.retailerImage ? (
                                                        <img src={order.retailerImage} alt={order.retailerName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {order.retailerName.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-black">{order.brandName}</span>
                                                        <span className="text-xs text-slate-500">{order.retailerName}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {order.productImage && (
                                                        <img src={order.productImage} alt="Product" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="text-black font-medium">{order.productCategory}</span>
                                                        <span className="text-xs text-slate-500">{order.quantity} Units</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">
                                                ৳{order.targetPricePerUnit}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {order.requestDate}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectOrder(order);
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : activeTab === 'samples' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSamples.map((sample) => (
                        <div key={sample.id} className="bg-white rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all group">
                            <div className="relative h-48 overflow-hidden">
                                <img 
                                    src={sample.image} 
                                    alt={sample.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    referrerPolicy="no-referrer"
                                />
                                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-slate-900">
                                    {sample.category}
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-black mb-2">{sample.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{sample.description}</p>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {sample.specifications.slice(0, 3).map((spec, idx) => (
                                        <span key={idx} className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                                            {spec}
                                        </span>
                                    ))}
                                    {sample.specifications.length > 3 && (
                                        <span className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                                            +{sample.specifications.length - 3} more
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <div>
                                        <p className="text-xs text-slate-500">Est. Price</p>
                                        <p className="font-bold text-emerald-600">৳{sample.price}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">MOQ</p>
                                        <p className="font-bold text-black">{sample.moq} Units</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredSamples.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                            <Package className="w-12 h-12 mb-3 opacity-50" />
                            <p>No sample products found.</p>
                            <button 
                                onClick={() => setShowAddSample(true)}
                                className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                            >
                                Add your first sample
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <AdminConfiguratorSettings 
                    custom3DModel={custom3DModel}
                    onUpdateCustomModel={onUpdateCustomModel}
                    fabricGSMOptions={fabricGSMOptions}
                    onUpdateFabricGSMOptions={onUpdateFabricGSMOptions}
                />
            )}
        </div>
    );
};
