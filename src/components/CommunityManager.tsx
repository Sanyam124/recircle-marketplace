'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';
import { getIcon } from '@/components/Icons';

export default function CommunityManager() {
    const { user, refreshUser } = useAuth();
    const [communities, setCommunities] = useState<any[]>([]);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // GPS State
    const [gpsEnabled, setGpsEnabled] = useState(false);

    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
    const [idProof, setIdProof] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Escape and Backdrop Click Handlers
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeUploadModal();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const closeUploadModal = () => {
        setShowUploadModal(false);
        setSelectedCommunity(null);
        setIdProof(null);
    };

    // Initial load: Copy verified communities from context if available
    useEffect(() => {
        if (user?.verifiedCommunities) {
             setCommunities(user.verifiedCommunities);
        }
        fetchPendingRequests();
    }, [user]);

    const fetchPendingRequests = async () => {
        try {
            const res = await fetch('/api/verifier/requests/me');
            if (res.ok) {
                const data = await res.json();
                setPendingRequests(data.requests || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const fetchResults = async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/communities?search=${encodeURIComponent(searchQuery)}&limit=5`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.communities);
                }
            } catch (error) {
                console.error("Failed to search communities", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleApply = async (community: any) => {
        setSelectedCommunity(community);
        setIsSubmitting(true);
        // 1. Try Auto-Verification First
        try {
            const res = await fetch('/api/communities/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ communityId: community._id, proofUrls: [] })
            });
            const data = await res.json();
            
            if (res.ok && data.mode === 'auto') {
                // Success! Email domain matched perfectly.
                sessionStorage.setItem('newVerification', community.name);
                await refreshUser();
                setSearchQuery('');
            } else {
                // Need Manual Verification
                if (res.status === 400 || res.status === 409) {
                    if (res.status === 409) {
                        showError('Already Requested', data.error); // Already requested
                    } else {
                        setShowUploadModal(true); // Open ID portal
                    }
                } else {
                    showError('Apply Failed', data.error || 'Failed to apply.');
                }
            }
        } catch (error) {
            console.error('Application Error:', error);
            showError('System Error', 'An unexpected error occurred. Check console for details.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setIdProof(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmitRequest = async () => {
        if (!idProof || !selectedCommunity) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/verifier/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ communityId: selectedCommunity._id, idProof })
            });
            if (res.ok) {
                showSuccess('Submitted', 'Verification Request Submitted! A verifier will review your ID soon.');
                setShowUploadModal(false);
                setIdProof(null);
                setSearchQuery('');
                fetchPendingRequests();
                await refreshUser();
            } else {
                const data = await res.json();
                showError('Submit Failed', data.error || 'Failed to submit application');
            }
        } catch (error) {
            console.error('Failed to submit application', error);
            showError('System Error', 'Error submitting application');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (communityId: string, name: string) => {
        const confirmed = await confirmAction({
            title: 'Confirm Removal',
            text: `Are you sure you want to remove your verification for ${name}? You will lose access to its exclusive content.`,
            dangerMode: true
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/profile/communities?communityId=${communityId}`, { method: 'DELETE' });
            if (res.ok) {
                setCommunities(prev => prev.filter(c => c._id !== communityId || c.id !== communityId));
                await refreshUser();
            } else {
                const data = await res.json();
                showError('Remove Failed', data.error || 'Failed to remove');
            }
        } catch (error) {
            console.error('Failed to remove community', error);
            showError('System Error', 'Error removing community');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8 transition-colors duration-300 relative">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500 opacity-5 dark:opacity-10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Trusted Communities (Circles)
                        <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-indigo-500/30">Beta</span>
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage the exclusive campuses and workspaces you have access to.</p>
                </div>
            </div>

            {/* Existing Communities */}
            {communities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {communities.map((community) => (
                        <div key={community._id || community.id} className="relative flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-gray-900/50 rounded-2xl border border-indigo-100 dark:border-gray-700/50 group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                    {community?.name ? community.name.charAt(0) : 'C'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">{community.name}</h3>
                                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                                        Verified Resident
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemove(community._id || community.id, community.name)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Leave Community"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 mb-3 tracking-widest px-1">Pending Review</h3>
                    <div className="space-y-3">
                        {pendingRequests.map(req => (
                            <div key={req._id} className="flex items-center justify-between p-4 bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-amber-100/50 dark:border-amber-900/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{req.community?.name}</p>
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-black uppercase">Wait for Officer Approval</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {communities.length === 0 && pendingRequests.length === 0 && (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 mb-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">You are not verified in any communities yet.</p>
                </div>
            )}

            {/* Smart Add Community Search */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Add a new Community</h3>
                
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {isSearching ? (
                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        )}
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a campus, office, or building..."
                        className="block w-full rounded-xl border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                    />

                    {/* Search Dropdown */}
                    {searchQuery.length >= 2 && searchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto">
                            {searchResults.map((result) => (
                                <div key={result._id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors">
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{result.name}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{result.emailDomains && result.emailDomains.length > 0 ? `Auto-approves @${result.emailDomains[0]}` : 'Manual ID required'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleApply(result)}
                                        className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold px-4 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p>Verified members get early access to products and exclusive community boards.</p>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div 
                    onClick={closeUploadModal}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300"
                    >
                        <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Verify Residency</h3>
                            <button onClick={closeUploadModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium">
                                To join <span className="text-indigo-600 font-black">{selectedCommunity?.name}</span>, please upload a photo of your student ID or official residency document.
                            </p>
                            
                            <div className="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 transition-all hover:border-indigo-400 dark:hover:border-indigo-500 group">
                                {idProof ? (
                                    <div className="relative">
                                        <img src={idProof} alt="ID Preview" className="w-full h-48 object-cover rounded-xl shadow-lg" />
                                        <button onClick={() => setIdProof(null)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center cursor-pointer">
                                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        <span className="text-xs font-black uppercase text-gray-500 group-hover:text-indigo-500 transition-colors">Select ID Photo</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                )}
                            </div>

                            <button 
                                disabled={!idProof || isSubmitting}
                                onClick={handleSubmitRequest}
                                className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit ID for Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
