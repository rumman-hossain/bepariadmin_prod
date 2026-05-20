import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, User as UserIcon, ShieldCheck, Store, Building, Paperclip, Image as ImageIcon, Video, FileText, X, Loader2, Download } from 'lucide-react';
import { Message, UserRole, Retailer, Wholesaler, MessageAttachment } from '../src/types/domain';


interface MessagesProps {
    userRole: UserRole;
    currentUserId: string;
    currentUserName: string;
    messages: Message[];
    onSendMessage: (msg: Omit<Message, 'id' | 'timestamp' | 'read'>) => void;
    retailers?: Retailer[];
    wholesalers?: Wholesaler[];
}

export const Messages: React.FC<MessagesProps> = ({ 
    userRole, currentUserId, currentUserName, messages, onSendMessage, retailers = [], wholesalers = [] 
}) => {
    const [selectedContactId, setSelectedContactId] = useState<string | null>(
        userRole === 'Super Admin' ? null : 'ADMIN'
    );
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [contactFilter, setContactFilter] = useState<'All' | 'Retailer' | 'Wholesaler'>('All');
    const [isUploading, setIsUploading] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedContactId]);

    // Filter contacts for Admin
    const contacts = userRole === 'Super Admin' ? [
        ...retailers.map(r => ({ id: r.id, name: r.shopName || r.ownerName || 'Unknown Retailer', role: 'Retailer' as UserRole })),
        ...wholesalers.map(w => ({ id: w.id, name: w.companyName || 'Unknown Wholesaler', role: 'Wholesaler' as UserRole }))
    ].filter(c => {
        const matchesSearch = (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase());
        const matchesFilter = contactFilter === 'All' || c.role === contactFilter;
        return matchesSearch && matchesFilter;
    }) : [];

    const selectedContact = userRole === 'Super Admin' 
        ? contacts.find(c => c.id === selectedContactId)
        : { id: 'ADMIN', name: 'BepariBD Support', role: 'Super Admin' as UserRole };

    // Filter messages for the current conversation
    const conversation = messages.filter(m => 
        (m.senderId === currentUserId && m.receiverId === selectedContactId) ||
        (m.senderId === selectedContactId && m.receiverId === currentUserId)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        try {
            // const fileRef = ref(, `messages/${currentUserId}/${Date.now()}_${file.name}`);
            // await uploadBytes(fileRef, file);
            // const url = await getDownloadURL(fileRef);

            // let type: 'image' | 'video' | 'file' = 'file';
            // if (file.type.startsWith('image/')) type = 'image';
            // else if (file.type.startsWith('video/')) type = 'video';

            // setPendingAttachment({
            //     type,
            //     url,
            //     name: file.name,
            //     size: file.size
            // });
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !pendingAttachment) || !selectedContactId || !selectedContact) return;

        onSendMessage({
            senderId: currentUserId,
            senderName: currentUserName,
            senderRole: userRole,
            receiverId: selectedContact.id,
            receiverName: selectedContact.name,
            receiverRole: selectedContact.role,
            content: newMessage.trim(),
            attachment: pendingAttachment || undefined
        });
        
        setNewMessage('');
        setPendingAttachment(null);
    };

    const getContactIcon = (role: UserRole) => {
        if (role === 'Super Admin') return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
        if (role === 'Retailer') return <Store className="w-5 h-5 text-blue-600" />;
        return <Building className="w-5 h-5 text-purple-600" />;
    };

    return (
        <div className="h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex overflow-hidden animate-fade-in">
            
            {/* Contacts Sidebar (Admin Only) */}
            {userRole === 'Super Admin' && (
                <div className="w-1/3 min-w-[250px] max-w-[350px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-charcoal-900">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-black mb-4">Messages</h2>
                        
                        {/* Role Filter Tabs */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
                            {(['All', 'Retailer', 'Wholesaler'] as const).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setContactFilter(filter)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                                        contactFilter === filter
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {filter === 'All' ? 'All' : filter === 'Wholesaler' ? 'Suppliers' : filter + 's'}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search contacts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {contacts.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">No contacts found</div>
                        ) : (
                            contacts.map(contact => {
                                const unread = messages.filter(m => m.senderId === contact.id && m.receiverId === currentUserId && !m.read).length;
                                return (
                                    <button
                                        key={contact.id}
                                        onClick={() => setSelectedContactId(contact.id)}
                                        className={`w-full p-4 flex items-center gap-3 text-left transition-colors border-b border-slate-100 dark:border-slate-800/50 ${
                                            selectedContactId === contact.id 
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                                            : 'hover:bg-white dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 dark:border-slate-600 shrink-0">
                                            {getContactIcon(contact.role)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="font-bold text-sm text-black truncate pr-2">{contact.name}</h3>
                                                {unread > 0 && (
                                                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">{contact.role}</p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white relative">
                {selectedContactId ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                    {selectedContact ? getContactIcon(selectedContact.role) : <UserIcon className="w-5 h-5 text-slate-500" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-black">{selectedContact?.name}</h3>
                                    <p className="text-xs text-slate-500">{selectedContact?.role}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-charcoal-900/50">
                            {conversation.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                        <Send className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                conversation.map(msg => {
                                    const isMe = msg.senderId === currentUserId;
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                                isMe 
                                                ? 'bg-emerald-600 text-white rounded-br-sm shadow-md shadow-emerald-600/10' 
                                                : 'bg-white text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm shadow-sm'
                                            }`}>
                                                {msg.attachment && (
                                                    <div className="mb-2">
                                                        {msg.attachment.type === 'image' ? (
                                                            <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-white/20">
                                                                <img src={msg.attachment.url} alt={msg.attachment.name} className="max-w-full h-auto" />
                                                            </a>
                                                        ) : msg.attachment.type === 'video' ? (
                                                            <video controls className="max-w-full rounded-lg border border-white/20">
                                                                <source src={msg.attachment.url} />
                                                                Your browser does not support the video tag.
                                                            </video>
                                                        ) : (
                                                            <a 
                                                                href={msg.attachment.url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-700'}`}
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                                <span className="text-xs truncate max-w-[150px]">{msg.attachment.name}</span>
                                                                <Download className="w-3 h-3 ml-auto" />
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 bg-white border-t border-slate-200 dark:border-slate-800">
                            {pendingAttachment && (
                                <div className="mb-3 flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-2">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-600">
                                        {pendingAttachment.type === 'image' ? <ImageIcon className="w-5 h-5 text-blue-500" /> : 
                                         pendingAttachment.type === 'video' ? <Video className="w-5 h-5 text-purple-500" /> : 
                                         <FileText className="w-5 h-5 text-slate-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-black truncate">{pendingAttachment.name}</p>
                                        <p className="text-[10px] text-slate-500">{(pendingAttachment.size! / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button 
                                        onClick={() => setPendingAttachment(null)}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSend} className="flex items-end gap-2">
                                <div className="relative flex-1">
                                    <textarea 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e);
                                            }
                                        }}
                                        placeholder="Type your message..."
                                        className="w-full max-h-32 min-h-[44px] pl-4 pr-12 py-2.5 bg-white text-black border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none shadow-inner"
                                        rows={1}
                                    />
                                    <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                                        <input 
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                                            title="Attach file"
                                        >
                                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <button 
                                    type="submit"
                                    disabled={(!newMessage.trim() && !pendingAttachment) || isUploading}
                                    className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 shrink-0"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                            <p className="text-[10px] text-slate-400 mt-2 text-center">
                                Press Enter to send, Shift + Enter for new line. 
                                {userRole !== 'Super Admin' && " You are messaging BepariBD Support directly."}
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-charcoal-900">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 mb-4">
                            <Send className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-500">Select a contact to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
};
