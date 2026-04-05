'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import ImageUpload from '@/components/ImageUpload';
import { showError, showSuccess, confirmAction } from '@/lib/confirm';

interface UserData {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    address: string;
    gender: string;
    bio: string;
    phone: string;
    profilePicture?: string;
    isPhoneVerified: boolean;
    usernameChangeCount: number;
}

export default function EditProfilePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshUser } = useAuth();
    const reason = searchParams.get('reason');
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        gender: 'none',
        bio: '',
        phone: '',
        address: '',
        profilePicture: ''
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const res = await fetch('/api/profile/data');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                
                setFormData({
                    name: data.user.name || '',
                    username: data.user.username || '',
                    gender: data.user.gender || 'none',
                    bio: data.user.bio || '',
                    phone: data.user.phone || '',
                    address: data.user.address || '',
                    profilePicture: data.user.profilePicture || ''
                });
            }
        } catch (error) {
            console.error('Failed to load user', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        
        // Strip newlines for specific fields (Global requirement)
        let val = value;
        if (['name', 'username', 'address'].includes(name)) {
            val = value.replace(/[\r\n]/g, '');
        }

        if (type === 'checkbox') {
            val = (e.target as HTMLInputElement).checked as any;
        }
        
        if (name === 'phone') {
            const numericValue = value.replace(/\D/g, '').slice(0, 15);
            setFormData((prev: any) => ({ ...prev, [name]: numericValue }));
            
            if (otpSent) {
                setOtpSent(false);
                setOtpCode('');
            }
            return;
        }

        setFormData((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleSendOtp = async () => {
        if (!formData.phone || formData.phone.length < 10) {
            showError('Invalid Phone', 'Please enter a valid phone number first');
            return;
        }
        setVerifying(true);
        try {
            const res = await fetch('/api/profile/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formData.phone })
            });
            if (res.ok) {
                setOtpSent(true);
                showSuccess('OTP Sent', 'Please check the server terminal.');
            } else {
                const data = await res.json();
                showError('OTP Failed', data.error || 'Failed to send OTP');
            }
        } catch (error) {
            console.error(error);
            showError('System Error', 'An error occurred while sending OTP.');
        } finally {
            setVerifying(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length !== 6) {
            showError('Invalid Code', 'Please enter a valid 6-digit OTP');
            return;
        }
        setVerifying(true);
        try {
            const res = await fetch('/api/profile/otp', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formData.phone, otp: otpCode })
            });
            if (res.ok) {
                showSuccess('Phone Verified', 'Your number has been successfully verified!');
                setOtpSent(false);
                setOtpCode('');
                await refreshUser(); // Update global auth state immediately
                fetchUserData();
            } else {
                const data = await res.json();
                showError('Verification Failed', data.error || 'Invalid OTP');
            }
        } catch (error) {
            console.error(error);
            showError('System Error', 'An error occurred during verification.');
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/profile/data', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: formData.name,
                    username: formData.username,
                    gender: formData.gender,
                    bio: formData.bio,
                    address: formData.address,
                    profilePicture: formData.profilePicture
                })
            });

            if (res.ok) {
                showSuccess('Profile Updated', 'Your changes have been saved.');
                router.push(`/profile/${user?.id || ''}`);
            } else {
                const data = await res.json();
                showError('Update Failed', data.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error(error);
            showError('System Error', 'An unexpected error occurred.');
            setSubmitting(false);
        }
    };
    
    // PREVENT FORM SUBMISSION ON ENTER KEY
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            // Only allow "Enter" for new lines in BIO textarea, block it everywhere else
            if (target.tagName === 'TEXTAREA' && (target as HTMLTextAreaElement).name === 'bio') {
                return; // Let standard behavior happen
            }
            // For all other fields (including Address textarea), block Enter
            e.preventDefault();
        }
    };

    if (loading) return <Loader />;
    if (!user) return <div className="text-center py-20">Failed to load profile</div>;

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 transition-colors">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Edit Profile</h1>

            {(reason === 'verify_to_list' || reason === 'verify_to_list_service') && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600 rounded-r-xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex gap-3">
                        <div className="shrink-0">
                            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Phone Verification Required</p>
                            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                                For listing {reason === 'verify_to_list' ? 'Products' : 'Services'}, Phone verification is mandatory. 
                                <span className="block mt-1 font-medium opacity-90 italic">
                                    Your number will not be shared until you turn on the "Allow Contact via Phone" option in your Settings.
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <form 
                onSubmit={handleSubmit} 
                onKeyDown={handleKeyDown}
                className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-6 border border-gray-100 dark:border-gray-700 transition-colors"
            >
                
                {/* Profile Picture Upload Section */}
                <div className="flex flex-col items-center pb-6 border-b border-gray-50 dark:border-gray-700">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 self-start">Profile Presentation</h3>
                    <ImageUpload
                        label="Change Profile Photo"
                        folder="recircle/profiles"
                        currentImage={formData.profilePicture}
                        onUpload={(url) => setFormData(prev => ({ ...prev, profilePicture: url }))}
                        onUploadingChange={setImageUploading}
                        imageClassName="w-32 h-32 rounded-full ring-4 ring-indigo-50 dark:ring-indigo-900/30"
                    />
                    <p className="mt-3 text-[10px] text-gray-400 font-medium">Clear photos build trust in the community</p>
                </div>

                {/* Basic Info Group */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Basic Identity</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <input 
                            type="text" 
                            name="name"
                            required
                            maxLength={30}
                            value={formData.name} 
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address / Location <span className="text-[10px] text-gray-400 font-normal ml-1">(Public if entered)</span></label>
                            <span className={`text-[10px] font-bold ${formData.address.length >= 140 ? 'text-red-500' : 'text-gray-400'}`}>
                                {formData.address.length}/150
                            </span>
                        </div>
                        <textarea 
                            name="address"
                            rows={2}
                            maxLength={150}
                            placeholder="City, State or Full Address"
                            value={formData.address} 
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                            {user.usernameChangeCount !== undefined && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${user.usernameChangeCount >= 3 ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-green-50 text-green-600 dark:bg-green-900/20'}`}>
                                    {user.usernameChangeCount >= 3 ? 'Limits Reached (3/3)' : `${3 - user.usernameChangeCount} changes remaining`}
                                </span>
                            )}
                        </div>
                        <div className={`mt-1 flex rounded-md shadow-sm ${(user.usernameChangeCount ?? 0) >= 3 ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            <span className={`inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 text-sm ${(user.usernameChangeCount ?? 0) >= 3 ? 'bg-gray-50 dark:bg-gray-700 text-gray-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'}`}>@</span>
                            <input 
                                type="text" 
                                name="username"
                                value={formData.username} 
                                maxLength={20}
                                disabled={(user.usernameChangeCount ?? 0) >= 3}
                                onChange={handleChange}
                                className={`flex-1 block w-full min-w-0 border-gray-300 dark:border-gray-600 rounded-none rounded-r-md sm:text-sm border py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${(user.usernameChangeCount ?? 0) >= 3 ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Verification Group */}
                <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Verification & Contact</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email (Verified)</label>
                            <input 
                                type="email" 
                                value={user.email} 
                                disabled 
                                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 sm:text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Phone Number
                            </label>
                            <div className="mt-1 flex flex-col gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <input 
                                        type="tel" 
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Your mobile number"
                                        disabled={otpSent}
                                        className={`flex-1 min-w-[150px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${otpSent ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    {(!user.isPhoneVerified || formData.phone !== user.phone) && !otpSent && (
                                        <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            disabled={verifying}
                                            className="px-3 py-2 text-xs font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                                        >
                                            {verifying ? '...' : (formData.phone === user?.phone ? 'Verify' : 'Change & Verify')}
                                        </button>
                                    )}
                                    {user.isPhoneVerified && formData.phone === user.phone && !otpSent && (
                                        <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800/30 rounded-md text-xs font-bold shadow-sm animate-in fade-in duration-500">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            Verified
                                        </div>
                                    )}
                                </div>

                                {formData.phone !== user.phone && !otpSent && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        Unverified change. Click verify to update your number.
                                    </p>
                                )}

                                {otpSent && (
                                    <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                                        <input 
                                            type="text" 
                                            placeholder="Enter 6-digit OTP"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="flex-1 min-w-[150px] border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleVerifyOtp}
                                            disabled={verifying}
                                            className="flex-shrink-0 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            {verifying ? '...' : 'Confirm'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOtpSent(false)}
                                            className="flex-shrink-0 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* About Group */}
                <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Bio & Preferences</h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender <span className="text-[10px] text-gray-400 font-normal ml-1">(Public if entered)</span></label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="none">None / Prefer not to say</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">About Me (Bio)</label>
                            <span className={`text-[10px] font-bold ${formData.bio.length >= 480 ? 'text-red-500' : 'text-gray-400'}`}>
                                {formData.bio.length}/500
                            </span>
                        </div>
                        <textarea 
                            name="bio"
                            rows={3}
                            maxLength={500}
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder="Tell others about yourself..."
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-50 dark:border-gray-700">
                    {formData.phone !== user.phone && (
                        <p className="text-right text-[11px] text-amber-600 dark:text-amber-500 font-bold mb-2 animate-pulse">
                            * Remember to Verify your new phone number!
                        </p>
                    )}
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none sm:text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || imageUploading || formData.name.trim().length < 3 || formData.name.trim().length > 30}
                            className={`inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 text-base font-medium text-white focus:outline-none sm:text-sm font-bold uppercase tracking-wide transition-all ${
                                (submitting || imageUploading || formData.name.trim().length < 3 || formData.name.trim().length > 30) ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {imageUploading ? 'Uploading Photo...' : submitting ? 'Saving...' : 'Save Improvements'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="mt-12 pt-8 border-t border-red-100 dark:border-red-900/30">
                <div className="bg-red-50/50 dark:bg-red-900/10 rounded-2xl p-6 border border-red-100 dark:border-red-900/20">
                    <h3 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-2">Danger Zone</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 font-medium leading-relaxed">
                        Deleting your account is permanent. All your listings, board posts, and profile data will be purged. 
                        Messages and orders will only be kept if the other party is still active on the platform.
                    </p>
                    <button
                        type="button"
                        onClick={async () => {
                            const confirmed = await confirmAction({
                                title: 'Delete Account?',
                                text: 'This will permanently remove your marketplace presence and data. Are you absolutely sure?',
                                dangerMode: true,
                                confirmButtonText: 'Permanently Delete'
                            });
                            if (confirmed) {
                                try {
                                    const res = await fetch('/api/profile/data', { method: 'DELETE' });
                                    const data = await res.json();
                                    if (res.ok) {
                                        showSuccess('Account Deleted', 'Proceeding to logout.');
                                        setTimeout(() => {
                                            window.location.href = '/auth';
                                        }, 1500);
                                    } else {
                                        showError('Deletion Blocked', data.error || 'Failed to delete account');
                                    }
                                } catch (e) {
                                    showError('System Error', 'Network error during account deletion.');
                                }
                            }
                        }}
                        className="px-6 py-3 bg-white dark:bg-gray-900 border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                        Delete My Account
                    </button>
                </div>
            </div>
        </div>
    );
}
