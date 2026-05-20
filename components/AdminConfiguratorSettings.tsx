import React, { useState } from 'react';
import { Save, Plus, Trash2, DollarSign, Settings, Layers, Palette, Package, Upload } from 'lucide-react';

interface AdminConfiguratorSettingsProps {
    custom3DModel: string | null;
    onUpdateCustomModel: (model: string | null) => void;
    fabricGSMOptions: { id: number; gsm: string; price: number }[];
    onUpdateFabricGSMOptions: (options: { id: number; gsm: string; price: number }[]) => void;
}

export const AdminConfiguratorSettings: React.FC<AdminConfiguratorSettingsProps> = ({ custom3DModel, onUpdateCustomModel, fabricGSMOptions, onUpdateFabricGSMOptions }) => {
    const [basePrice, setBasePrice] = useState(500);
    
    const [materials, setMaterials] = useState([
        { id: 1, name: '100% Cotton', price: 0 },
        { id: 2, name: 'Polyester Blend', price: -50 },
        { id: 3, name: 'Premium Heavyweight', price: 150 },
    ]);

    const [printAreas, setPrintAreas] = useState([
        { id: 1, name: 'Front Center', price: 100 },
        { id: 2, name: 'Back Center', price: 100 },
        { id: 3, name: 'Left Sleeve', price: 50 },
        { id: 4, name: 'Right Sleeve', price: 50 },
    ]);

    const [sizeUpcharges, setSizeUpcharges] = useState([
        { id: 1, name: 'XXL', price: 50 },
        { id: 2, name: '3XL', price: 100 },
    ]);

    const handleSave = () => {
        // Mock save
        alert('Configurator settings saved successfully!');
    };

    const updateMaterial = (id: number, field: string, value: string | number | boolean) => {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const updatePrintArea = (id: number, field: string, value: string | number | boolean) => {
        setPrintAreas(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const updateSizeUpcharge = (id: number, field: string, value: string | number | boolean) => {
        setSizeUpcharges(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const updateGSMOption = (id: number, field: string, value: string | number | boolean) => {
        onUpdateFabricGSMOptions(fabricGSMOptions.map(o => o.id === id ? { ...o, [field]: value } : o));
    };

    const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            onUpdateCustomModel(url);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Package className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-black">3D Base Model</h3>
                        <p className="text-sm text-slate-500">Upload the default 3D model for the T-Shirt Configurator</p>
                    </div>
                </div>
                
                <div className="max-w-xl">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        Model File (.glb / .gltf)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                        <label className="w-full flex items-center justify-center gap-3 px-6 py-10 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                </div>
                                <span className="text-base font-bold text-slate-700 dark:text-slate-200">
                                    {custom3DModel ? 'Change Model File' : 'Upload 3D Model'}
                                </span>
                                <p className="text-xs text-slate-400 mt-2">Supports GLB, GLTF (Max 20MB)</p>
                            </div>
                            <input 
                                type="file" 
                                accept=".glb,.gltf"
                                className="hidden"
                                onChange={handleModelUpload}
                            />
                        </label>
                        
                        {custom3DModel && (
                            <div className="flex flex-col gap-3 w-full sm:w-64">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl shadow-sm">
                                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
                                        <Package className="w-4 h-4" /> Model Active
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 leading-relaxed">
                                        This model is now live in the retailer configurator.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => onUpdateCustomModel(null)}
                                    className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30"
                                >
                                    <Trash2 className="w-4 h-4" /> Remove Model
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-black">Base Pricing</h3>
                        <p className="text-sm text-slate-500">Set the starting price for the base T-Shirt model</p>
                    </div>
                </div>
                
                <div className="max-w-xs">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Base Price (৳)</label>
                    <input 
                        type="number" 
                        min="0"
                        value={basePrice}
                        onChange={(e) => setBasePrice(Math.max(0, Number(e.target.value)))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-black shadow-sm transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Materials */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                            <Layers className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-black">Material Variations</h3>
                            <p className="text-sm text-slate-500">Price adjustments based on fabric type</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {materials.map(material => (
                            <div key={material.id} className="flex gap-4 items-center">
                                <input 
                                    type="text" 
                                    value={material.name}
                                    onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black shadow-sm transition-all outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="w-32 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">৳</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={material.price}
                                        onChange={(e) => updateMaterial(material.id, 'price', Math.max(0, Number(e.target.value)))}
                                        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black shadow-sm transition-all outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Print Areas */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                            <Palette className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-black">Print Areas</h3>
                            <p className="text-sm text-slate-500">Cost per additional print location</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {printAreas.map(area => (
                            <div key={area.id} className="flex gap-4 items-center">
                                <input 
                                    type="text" 
                                    value={area.name}
                                    onChange={(e) => updatePrintArea(area.id, 'name', e.target.value)}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black shadow-sm transition-all outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <div className="w-32 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">৳</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={area.price}
                                        onChange={(e) => updatePrintArea(area.id, 'price', Math.max(0, Number(e.target.value)))}
                                        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black shadow-sm transition-all outline-none focus:ring-2 focus:ring-purple-500 text-right"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Size Upcharges */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                            <Settings className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-black">Size Upcharges</h3>
                            <p className="text-sm text-slate-500">Extra cost for larger sizes</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {sizeUpcharges.map(size => (
                            <div key={size.id} className="flex gap-4 items-center">
                                <input 
                                    type="text" 
                                    value={size.name}
                                    onChange={(e) => updateSizeUpcharge(size.id, 'name', e.target.value)}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black shadow-sm transition-all outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <div className="w-32 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">৳</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={size.price}
                                        onChange={(e) => updateSizeUpcharge(size.id, 'price', Math.max(0, Number(e.target.value)))}
                                        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black shadow-sm transition-all outline-none focus:ring-2 focus:ring-orange-500 text-right"
                                    />
                                </div>
                            </div>
                        ))}
                        <button 
                            onClick={() => setSizeUpcharges([...sizeUpcharges, { id: Date.now(), name: '', price: 0 }])}
                            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-bold mt-4 transition-colors"
                        >
                            <Plus className="w-5 h-5" /> Add Size Rule
                        </button>
                    </div>
                </div>

                {/* Fabric GSM Settings */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl text-teal-600 dark:text-teal-400">
                            <Layers className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-black">Fabric GSM (Thickness)</h3>
                            <p className="text-sm text-slate-500">Price adjustments based on fabric weight</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {fabricGSMOptions.map(option => (
                            <div key={option.id} className="flex gap-4 items-center">
                                <input 
                                    type="text" 
                                    value={option.gsm}
                                    onChange={(e) => updateGSMOption(option.id, 'gsm', e.target.value)}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black shadow-sm transition-all outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="e.g. 160 GSM"
                                />
                                <div className="w-32 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">৳</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={option.price}
                                        onChange={(e) => updateGSMOption(option.id, 'price', Math.max(0, Number(e.target.value)))}
                                        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black shadow-sm transition-all outline-none focus:ring-2 focus:ring-teal-500 text-right"
                                    />
                                </div>
                                <button 
                                    onClick={() => onUpdateFabricGSMOptions(fabricGSMOptions.filter(o => o.id !== option.id))}
                                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={() => onUpdateFabricGSMOptions([...fabricGSMOptions, { id: Date.now(), gsm: '', price: 0 }])}
                            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-bold mt-4 transition-colors"
                        >
                            <Plus className="w-5 h-5" /> Add GSM Option
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-slate-200 dark:border-slate-700">
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Save className="w-5 h-5" />
                    Save Configurator Settings
                </button>
            </div>
        </div>
    );
};
