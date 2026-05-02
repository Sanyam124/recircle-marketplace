'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Loader from '@/components/Loader';
import ImageUpload from '@/components/ImageUpload';
import NextImage from 'next/image';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';

export default function AdminCommunitiesPage() {
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', 
        emailDomains: '', 
        description: '', 
        image: '',
        isManualVerificationEnabled: true
    });
    const [imageUploading, setImageUploading] = useState(false);
    const [selectedCommForHostels, setSelectedCommForHostels] = useState<any>(null);
    const [communityStats, setCommunityStats] = useState<any>(null);
    const [hostelsInput, setHostelsInput] = useState('');
    const [isUpdatingHostels, setIsUpdatingHostels] = useState(false);
    const [isTogglingVerification, setIsTogglingVerification] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);

    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchCommunities();
    }, []);

    const fetchCommunityDetails = async (comm: any) => {
        setSelectedCommForHostels(comm);
        setCommunityStats(null); // Reset while loading
        try {
            const res = await fetch(`/api/admin/communities/${comm._id}`);
            if (res.ok) {
                const data = await res.json();
                setCommunityStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch community stats', error);
        }
    };

    const handleToggleStatus = async () => {
        if (!selectedCommForHostels) return;
        
        const actionText = selectedCommForHostels.isActive ? 'Pause' : 'Resume';
        const confirmed = await confirmAction({
            title: `${actionText} Circle?`,
            text: `This will ${selectedCommForHostels.isActive ? 'hide' : 'show'} all listings and information for this circle.`,
            confirmButtonText: `Yes, ${actionText}`
        });
        if (!confirmed) return;

        setIsTogglingStatus(true);
        try {
            const res = await fetch(`/api/admin/communities/${selectedCommForHostels._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_active' })
            });

            if (res.ok) {
                const data = await res.json();
                setCommunities(communities.map(c => c._id === selectedCommForHostels._id ? data.community : c));
                setSelectedCommForHostels(data.community);
                showSuccess('Status Updated', `Community circle is now ${data.community.isActive ? 'Live' : 'Paused'}.`);
            }
        } catch (error) {
            showError('Error', 'Failed to update status');
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const fetchCommunities = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/communities');
            if (res.ok) {
                const data = await res.json();
                setCommunities(data.communities || []);
                setTotalCount(data.totalCount || data.communities?.length || 0);
            }
        } catch (error) {
            console.error('Failed to fetch communities', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const domains = formData.emailDomains.split(',').map(d => d.trim()).filter(Boolean);
        
        try {
            const res = await fetch('/api/admin/communities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, emailDomains: domains }),
            });
            if (res.ok) {
                const data = await res.json();
                setCommunities([data.community, ...communities]);
                setIsAdding(false);
                setFormData({ name: '', emailDomains: '', description: '', image: '', isManualVerificationEnabled: true });
                showSuccess('Circle Created', 'Community circle has been added.');
            } else {
                const err = await res.json();
                showError('Creation Failed', err.error || 'Failed to create');
            }
        } catch (error) {
            console.error('Failed to create', error);
        }
    };

    const handleToggleManualVerification = async (currentStatus: boolean) => {
        if (!selectedCommForHostels) return;
        
        setIsTogglingVerification(true);
        try {
            const res = await fetch(`/api/admin/communities/${selectedCommForHostels._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'toggle_manual_verification', 
                    isManualVerificationEnabled: !currentStatus 
                })
            });

            if (res.ok) {
                const data = await res.json();
                setCommunities(communities.map(c => c._id === selectedCommForHostels._id ? data.community : c));
                setSelectedCommForHostels(data.community);
                showSuccess('Verification Updated', `Manual verification is now ${!currentStatus ? 'ENABLED' : 'DISABLED'}.`);
            } else {
                const err = await res.json();
                showError('Update Failed', err.error || 'Failed to toggle verification');
            }
        } catch (error) {
            showError('System Error', 'Failed to update verification setting');
        } finally {
            setIsTogglingVerification(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirmAction({
            title: 'Delete Circle?',
            text: 'Are you sure you want to delete this community? All associated verification rules will be lost.',
            dangerMode: true,
            confirmButtonText: 'Delete Circle'
        });
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/admin/communities?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setCommunities(communities.filter(c => c._id !== id));
                showSuccess('Circle Deleted', 'The community circle was removed.');
            }
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    const handleUpdateHostels = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCommForHostels) return;

        const newHostels = hostelsInput
            .split(',')
            .map(h => h.trim())
            .filter(Boolean);

        if (newHostels.length === 0) {
            return showError('Error', 'Please enter at least one hostel name.');
        }

        const updatedHostels = [...(selectedCommForHostels.hostels || []), ...newHostels];
        // Deduplicate using Set
        const uniqueHostels = Array.from(new Set(updatedHostels));

        setIsUpdatingHostels(true);
        try {
            const res = await fetch(`/api/admin/communities/${selectedCommForHostels._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_hostels', hostels: uniqueHostels })
            });

            if (res.ok) {
                const data = await res.json();
                setCommunities(communities.map(c => c._id === selectedCommForHostels._id ? data.community : c));
                setSelectedCommForHostels(data.community);
                setHostelsInput('');
                showSuccess('Hostels Updated', 'The requested hostels have been added.');
            } else {
                const err = await res.json();
                showError('Update Failed', err.error || 'Failed to add hostels');
            }
        } catch (error) {
            showError('System Error', 'Failed to update hostels');
        } finally {
            setIsUpdatingHostels(false);
        }
    };

    const handleRemoveHostel = async (hostelToRemove: string) => {
         if (!selectedCommForHostels) return;
         const confirmed = await confirmAction({title: 'Remove Hostel', text: `Remove ${hostelToRemove}?`, dangerMode: true});
         if (!confirmed) return;

         const updatedHostels = selectedCommForHostels.hostels.filter((h: string) => h !== hostelToRemove);

         try {
            const res = await fetch(`/api/admin/communities/${selectedCommForHostels._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_hostels', hostels: updatedHostels })
            });

            if (res.ok) {
                const data = await res.json();
                setCommunities(communities.map(c => c._id === selectedCommForHostels._id ? data.community : c));
                setSelectedCommForHostels(data.community);
            }
         } catch (error) {
             showError('Error', 'Failed to remove hostel');
         }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campus Circles ({totalCount})</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Define and manage university communities and their email domains.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                >
                    {isAdding ? 'Cancel' : 'Add New Circle'}
                </button>
            </div>

            {isAdding && (
                <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleCreate} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2 flex justify-center mb-4">
                            <ImageUpload
                                label="Upload Circle Logo/Banner"
                                folder="recircle/communities"
                                onUpload={(url) => setFormData({ ...formData, image: url })}
                                onUploadingChange={setImageUploading}
                                currentImage={formData.image}
                                imageClassName="w-40 h-24 rounded-2xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Circle Name</label>
                            <input
                                required
                                type="text"
                                className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm p-2.5"
                                placeholder="e.g. Parul University"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Domains (comma separated)</label>
                            <input
                                required
                                type="text"
                                className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm p-2.5"
                                placeholder="e.g. paruluniversity.ac.in, student.pu.ac.in"
                                value={formData.emailDomains}
                                onChange={e => setFormData({ ...formData, emailDomains: e.target.value })}
                            />
                        </div>
                        <div className="sm:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center w-full">Enable Manual ID Verification?</label>
                             <div className="flex justify-center mt-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isManualVerificationEnabled: !formData.isManualVerificationEnabled })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-transparent focus:ring-indigo-500 ${formData.isManualVerificationEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    <span className={`${formData.isManualVerificationEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                </button>
                                <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                                    {formData.isManualVerificationEnabled ? 'Allowed (ID Uploads Enabled)' : 'Prohibited (Auto-Verification Only)'}
                                </span>
                             </div>
                        </div>
                        <div className="sm:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                             <textarea
                                className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm p-2.5"
                                rows={2}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                             />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                             <button type="submit" disabled={imageUploading} className={`px-6 py-2 text-white rounded-lg font-bold shadow-md transition-all ${imageUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                {imageUploading ? 'Uploading Image...' : 'Create Community Circle'}
                             </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <Loader />
            ) : communities.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No campus circles created yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {communities.map((comm) => (
                        <div key={comm._id} onClick={() => fetchCommunityDetails(comm)} className={`bg-white dark:bg-gray-800 rounded-2xl border ${comm.isActive ? 'border-gray-100 dark:border-gray-700' : 'border-amber-500/50 dark:border-amber-500/30'} p-6 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative cursor-pointer ring-2 ring-transparent hover:ring-indigo-500/30`}>
                            {!comm.isActive && (
                                <div className="absolute top-4 right-4 z-20 px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse">
                                    PAUSED
                                </div>
                            )}
                            {comm.image && (
                                <div className="absolute inset-0 z-0 h-full w-full opacity-10 blur-[2px]">
                                    <NextImage src={comm.image} alt="" fill className="object-cover" />
                                </div>
                            )}
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 overflow-hidden border border-emerald-500/20">
                                        {comm.image ? (
                                            <NextImage src={comm.image} alt={comm.name} width={48} height={48} className="object-cover w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(comm._id);
                                        }}
                                        className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{comm.name}</h3>
                                {comm.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 h-8">{comm.description}</p>
                                )}
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-3">{comm.hostels?.length || 0} Hostels Added</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {comm.emailDomains.map((domain: string) => (
                                        <span key={domain} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-600">
                                            @{domain}
                                        </span>
                                    ))}
                                </div>
                                <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>Created {new Date(comm.createdAt).toLocaleDateString()}</span>
                                    <span className={`flex items-center gap-1 ${comm.isActive ? 'text-green-500' : 'text-amber-500'}`}>
                                        <span className="w-2 h-2 rounded-full bg-current"></span>
                                        {comm.isActive ? 'Live' : 'Paused'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Comprehensive Community Settings Modal */}
            {selectedCommForHostels && (
                <div onClick={() => { setSelectedCommForHostels(null); setCommunityStats(null); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Circle Control Center: {selectedCommForHostels.name}
                                    {!selectedCommForHostels.isActive && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-tighter font-black">PAUSED</span>}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Configure verification rules, hostel lists, and metadata.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleToggleStatus}
                                    disabled={isTogglingStatus}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedCommForHostels.isActive ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-200' : 'bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {selectedCommForHostels.isActive ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />}
                                    </svg>
                                    {isTogglingStatus ? 'Working...' : (selectedCommForHostels.isActive ? 'Pause' : 'Resume')}
                                </button>
                                <button onClick={() => { setSelectedCommForHostels(null); setCommunityStats(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Management Stats Banner */}
                        <div className="bg-indigo-600 dark:bg-indigo-900 px-6 py-5 flex flex-wrap gap-8 items-center justify-center text-white shadow-inner relative overflow-hidden">
                            {/* Decorative background circle */}
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                            
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-indigo-100/70 tracking-widest mb-1">Total Members</span>
                                <span className="text-3xl font-black">{communityStats ? communityStats.totalMembers : '...'}</span>
                            </div>

                            <div className="w-px h-10 bg-white/20 hidden sm:block"></div>

                            <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-indigo-100/70 tracking-widest mb-1 text-center">Active Listings</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl font-black leading-none">{communityStats ? communityStats.totalItems : '...'}</span>
                                    {communityStats && (
                                        <div className="flex items-center gap-2 mt-1.5 px-2 py-0.5 bg-white/10 rounded-full text-[9px] font-bold tracking-tight">
                                            <span className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                {communityStats.products} Products
                                            </span>
                                            <span className="w-px h-2 bg-white/20"></span>
                                            <span className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                {communityStats.services} Services
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-px h-10 bg-white/20 hidden sm:block"></div>

                            <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-indigo-100/70 tracking-widest mb-1">Circle Status</span>
                                <span className={`text-sm font-bold flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 ${selectedCommForHostels.isActive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                                    <span className={`w-2 h-2 rounded-full relative ${selectedCommForHostels.isActive ? 'bg-green-400' : 'bg-amber-400'}`}>
                                        <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${selectedCommForHostels.isActive ? 'bg-green-400' : 'bg-amber-400'}`}></span>
                                    </span>
                                    {selectedCommForHostels.isActive ? 'Active' : 'Maintenance'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-8">
                                {/* Section 1: Security & Verification Toggle */}
                                <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">ID Verification</h4>
                                        <p className="text-[10px] text-amber-700 dark:text-amber-500/80 mt-1 uppercase font-bold">Manual Overrides</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedCommForHostels.isManualVerificationEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                                            {selectedCommForHostels.isManualVerificationEnabled ? 'Allowed' : 'Prohibited'}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={isTogglingVerification}
                                            onClick={() => handleToggleManualVerification(selectedCommForHostels.isManualVerificationEnabled)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${selectedCommForHostels.isManualVerificationEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'} ${isTogglingVerification ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span className={`${selectedCommForHostels.isManualVerificationEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Section 2: Hostels Management */}
                                <div className="p-5 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-400 mb-4">Hostel Directory</h4>
                                    <form onSubmit={handleUpdateHostels} className="mb-4">
                                        <textarea
                                            className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm p-4 focus:ring-2 focus:ring-indigo-500 mb-3"
                                            rows={2}
                                            placeholder="Add hostels (comma separated)..."
                                            value={hostelsInput}
                                            onChange={(e) => setHostelsInput(e.target.value)}
                                        ></textarea>
                                        <div className="flex justify-end">
                                            <button type="submit" disabled={isUpdatingHostels || !hostelsInput} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                                {isUpdatingHostels ? 'Adding...' : '+ Add Hostels'}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-200">
                                        {selectedCommForHostels.hostels && selectedCommForHostels.hostels.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedCommForHostels.hostels.map((hostel: string, index: number) => (
                                                    <div key={index} className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                                        <span className="truncate max-w-[100px]">{hostel}</span>
                                                        <button onClick={() => handleRemoveHostel(hostel)} className="text-red-400 hover:text-red-600 transition-colors">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-center py-4 text-xs italic text-gray-400">No hostels listed.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Section 3: Metadata Editing */}
                                <div className="p-5 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 rounded-2xl">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Edit Circle Details</h4>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.target as any;
                                        const name = form.name.value;
                                        const description = form.description.value;
                                        const domains = form.domains.value.split(',').map((d: string) => d.trim()).filter(Boolean);

                                        try {
                                            const res = await fetch(`/api/admin/communities/${selectedCommForHostels._id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ action: 'update_metadata', name, description, emailDomains: domains })
                                            });
                                            if (res.ok) {
                                                const data = await res.json();
                                                setCommunities(communities.map(c => c._id === selectedCommForHostels._id ? data.community : c));
                                                setSelectedCommForHostels(data.community);
                                                showSuccess('Updated', 'Circle metadata has been synchronized.');
                                            }
                                        } catch (e) { showError('Error', 'Update failed'); }
                                    }} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Display Name</label>
                                            <input name="name" defaultValue={selectedCommForHostels.name} className="w-full text-sm rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email Domains (Split by comma)</label>
                                            <input name="domains" defaultValue={selectedCommForHostels.emailDomains.join(', ')} className="w-full text-sm rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 font-mono" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">About Circle (Detailed Description)</label>
                                            <textarea name="description" defaultValue={selectedCommForHostels.description} rows={4} className="w-full text-sm rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2" />
                                        </div>
                                        <button type="submit" className="w-full py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-xs font-bold hover:opacity-90 transition-all">
                                            Save All Changes
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
