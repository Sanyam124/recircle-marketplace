'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';
import Image from 'next/image';

export default function CommunityManager() {
    const { user, refreshUser } = useAuth();
    const [communities, setCommunities] = useState<any[]>([]);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
    const [idProof, setIdProof] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        } catch (error) { console.error(error); }
    };

    const closeUploadModal = () => {
        setShowUploadModal(false);
        setSelectedCommunity(null);
        setIdProof(null);
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
            } catch (error) { console.error(error); } finally { setIsSearching(false); }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleApply = async (community: any) => {
        setSelectedCommunity(community);
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/communities/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ communityId: community._id, proofUrls: [] })
            });
            const data = await res.json();
            
            if (res.ok && data.mode === 'auto') {
                sessionStorage.setItem('newVerification', community.name);
                await refreshUser();
                setSearchQuery('');
                showSuccess('Verified!', `You have been automatically verified for ${community.name}`);
            } else if (res.status === 400 || res.status === 409) {
                if (res.status === 409) showError('Already Requested', data.error);
                else setShowUploadModal(true);
            } else {
                showError('Apply Failed', data.error || 'Failed to apply.');
            }
        } catch (error) { showError('System Error', 'An unexpected error occurred.'); } finally { setIsSubmitting(false); }
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
                await refreshUser();
            } else {
                const data = await res.json();
                showError('Remove Failed', data.error || 'Failed to remove');
            }
        } catch (error) { showError('System Error', 'Error removing community'); }
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
        } catch (error) { showError('System Error', 'Error submitting application'); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="space-y-6">
            {/* Box 1: Verified Communities */}
            <div className="bg-white dark:bg-slate-900/30 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8 ml-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Verified Communities</h3>
                    <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-indigo-500/30">Trusted Profile</span>
                </div>

                {communities.length > 0 || pendingRequests.length > 0 ? (
                    <div className="space-y-4">
                        {/* List Verified */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {communities.map((community) => (
                                <div key={community._id || community.id} className="flex items-center justify-between p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 group hover:border-indigo-300 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-800">
                                            {community?.name?.charAt(0) || 'C'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{community.name}</h4>
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                                                Active Circle
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(community._id || community.id, community.name)}
                                        className="text-slate-300 hover:text-rose-500 transition-colors p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800"
                                        title="Leave Community"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* List Pending */}
                        {pendingRequests.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-[0.2em] ml-2 italic">Awaiting Approval</h4>
                                <div className="space-y-3">
                                    {pendingRequests.map(req => (
                                        <div key={req._id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl">
                                            <div className="flex items-center gap-3 opacity-60">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{req.community?.name}</p>
                                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest italic">Review in progress...</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 italic">No verified circles yet</p>
                    </div>
                )}
            </div>

            {/* Box 2: Add a new Community */}
            <div className="bg-white dark:bg-slate-900/30 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-6 ml-2">Add a new Community</h3>
                
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-slate-400">
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
                        placeholder="Search for a campus or hostel/building..."
                        className="block w-full bg-slate-50 dark:bg-slate-950/50 border-none rounded-2xl text-[11px] font-black pl-11 pr-4 py-4 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                    />

                    {/* Search Dropdown */}
                    {searchQuery.length >= 2 && searchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white dark:border-slate-700 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300">
                            {searchResults.map((result) => (
                                <div key={result._id} className="flex items-center justify-between p-4 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors">
                                    <div>
                                        <h4 className="font-black text-sm text-slate-900 dark:text-white">{result.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{result.emailDomains?.length > 0 ? `Verified Domain: @${result.emailDomains[0]}` : 'Manual ID Verification'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleApply(result)}
                                        className="text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white px-5 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                                    >
                                        Apply
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="mt-6 flex items-start gap-3 bg-indigo-50/20 dark:bg-indigo-950/10 p-4 rounded-2xl border border-indigo-50 dark:border-indigo-950/30">
                    <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[10px] font-bold text-indigo-900/70 dark:text-indigo-300/60 leading-relaxed italic">Verified members receive priority reach, exclusive badges, and access to campus-wide announcement boards.</p>
                </div>
            </div>

            {/* Upload Modal (Moved inside CommunityManager for self-containment) */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div 
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-8 duration-500"
                    >
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                            <div>
                                <h3 className="text-xl font-black italic tracking-tighter italic">Verify Residency</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mt-1">Officer Review Required</p>
                            </div>
                            <button onClick={closeUploadModal} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                                Upload your <span className="text-slate-900 dark:text-white font-black italic">Student ID</span> or <span className="text-slate-900 dark:text-white font-black italic">Residency Certificate</span> for <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedCommunity?.name}</span>.
                            </p>
                            
                            <div className="relative border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] p-4 transition-all hover:border-indigo-400 group">
                                {idProof ? (
                                    <div className="relative">
                                        <img src={idProof} alt="ID Preview" className="w-full h-56 object-cover rounded-[1.5rem] shadow-2xl" />
                                        <button onClick={() => setIdProof(null)} className="absolute top-3 right-3 bg-rose-600 text-white p-2.5 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center cursor-pointer py-10">
                                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 ring-8 ring-indigo-50/50 dark:ring-indigo-900/10 group-hover:scale-110 transition-transform">
                                            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Capture ID Photo</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const r = new FileReader();
                                                r.onloadend = () => setIdProof(r.result as string);
                                                r.readAsDataURL(file);
                                            }
                                        }} />
                                    </label>
                                )}
                            </div>

                            <button 
                                disabled={!idProof || isSubmitting}
                                onClick={handleSubmitRequest}
                                className="w-full mt-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-300 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                )}
                                {isSubmitting ? 'SECURELY UPLOADING...' : 'SUBMIT AUTHENTICATION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
