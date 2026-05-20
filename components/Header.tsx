import React from 'react';
import { Search, Menu, Moon, Sun, LogOut } from 'lucide-react';
import { NotificationsPopover } from './NotificationsPopover';
import { AppNotification } from '../types';

interface HeaderProps {
    toggleSidebar: () => void;
    darkMode: boolean;
    setDarkMode: (val: boolean) => void;
    notifications: AppNotification[];
    onMarkNotificationRead: (id: string) => void;
    onMarkAllNotificationsRead: () => void;
    onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    toggleSidebar, darkMode, setDarkMode, notifications, onMarkNotificationRead, onMarkAllNotificationsRead, onLogout 
}) => {
    return (
        <header className="h-16 bg-white border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-40 transition-colors">
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors">
                    <Menu className="w-5 h-5" />
                </button>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl w-64 border border-transparent focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Global Search..." 
                        className="bg-transparent border-none outline-none text-sm text-slate-900 dark:text-slate-200 w-full placeholder-slate-400"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setDarkMode(!darkMode)} 
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <NotificationsPopover 
                    notifications={notifications}
                    onMarkRead={onMarkNotificationRead}
                    onMarkAllRead={onMarkAllNotificationsRead}
                />
                {onLogout && (
                    <button 
                        onClick={onLogout} 
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-colors ml-2"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </div>
        </header>
    )
}