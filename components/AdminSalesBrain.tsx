import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Brain, Users, PhoneCall, Megaphone, Wrench } from 'lucide-react';
import { AdminSegmentationEngine } from './AdminSegmentationEngine';
import { AdminCRMPipeline } from './AdminCRMPipeline';
import { AdminPromotionalCampaigns } from './AdminPromotionalCampaigns';

import { Retailer } from '../types';

interface AdminSalesBrainProps {
    retailers: Retailer[];
}

export const AdminSalesBrain: React.FC<AdminSalesBrainProps> = ({ retailers }) => {
    const [activeTab, setActiveTab] = useState('segmentation');

    const tabs = [
        { id: 'segmentation', label: 'Retailer SEGMENTATION ENGINE', icon: Users },
        { id: 'crm', label: 'Smart Follow-Up Engine & CRM Pipeline', icon: PhoneCall },
        { id: 'campaigns', label: 'Smart Promotional Campaign System', icon: Megaphone },
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Brain className="w-8 h-8 text-indigo-600" />
                        Sales Brain
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">The central intelligence hub for sales, marketing, and retailer growth.</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-72 shrink-0">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible hide-scrollbar">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap lg:whitespace-normal text-left ${
                                        isActive 
                                            ? 'bg-indigo-50 text-indigo-700' 
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                    {activeTab === 'segmentation' ? (
                        <AdminSegmentationEngine retailers={retailers} />
                    ) : activeTab === 'crm' ? (
                        <AdminCRMPipeline retailers={retailers} />
                    ) : activeTab === 'campaigns' ? (
                        <AdminPromotionalCampaigns retailers={retailers} />
                    ) : (
                        <Card className="p-12 rounded-3xl border-0 shadow-lg shadow-slate-200/40 flex flex-col items-center justify-center text-center min-h-[400px] bg-gradient-to-br from-slate-50 to-white">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                <Wrench className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Under Construction</h2>
                            <p className="text-slate-500 max-w-md mx-auto">
                                The <span className="font-bold text-indigo-600">{tabs.find(t => t.id === activeTab)?.label}</span> module is currently being built. Check back soon for powerful new features!
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
