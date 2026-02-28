'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';

interface UserData {
    name: string;
    username: string;
    email: string;
    role: string;
    address?: string;
    gender?: string;
    bio?: string;
}

export default function EditProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        gender: 'none',
        bio: ''
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
                    bio: data.user.bio || ''
                });
            }
        } catch (error) {
            console.error('Failed to load user', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        
        try {
            const res = await fetch('/api/profile/data', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: formData.name,
                    username: formData.username,
                    gender: formData.gender,
                    bio: formData.bio,
                })
            });

            if (res.ok) {
                alert('Profile Updated Successfully');
                router.push('/profile');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        }
    };

    if (loading) return <Loader />;
    if (!user) return <div className="text-center py-20">Failed to load profile</div>;

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 transition-colors">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Edit Profile</h1>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6 border border-gray-100 dark:border-gray-700 transition-colors">
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
                    {formData.name.length > 0 && formData.name.length < 3 && (
                        <p className="mt-1.5 text-xs text-red-500 font-medium font-outfit">Name should be between 3-30 characters</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username (Permanent)</label>
                    <div className="mt-1 flex rounded-md shadow-sm opacity-60">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">@</span>
                        <input 
                            type="text" 
                            name="username"
                            value={formData.username} 
                            disabled
                            className="flex-1 block w-full min-w-0 border-gray-300 dark:border-gray-600 rounded-none rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm border py-2 px-3 cursor-not-allowed"
                        />
                    </div>
                    <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-medium">Username is permanent and uniquely identifies you on campus.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email (Read-only)</label>
                    <input 
                        type="email" 
                        value={user.email} 
                        disabled 
                        className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 sm:text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                    <textarea 
                        name="bio"
                        rows={3}
                        value={formData.bio}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none sm:text-sm transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={formData.name.trim().length < 3 || formData.name.trim().length > 30}
                        className={`inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 text-base font-medium text-white focus:outline-none sm:text-sm font-bold uppercase tracking-wide transition-all ${
                            (formData.name.trim().length < 3 || formData.name.trim().length > 30) ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                        Save Improvements
                    </button>
                </div>
            </form>
        </div>
    );
}
