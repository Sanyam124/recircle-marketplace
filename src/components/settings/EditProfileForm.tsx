import React from 'react';
import NextImage from 'next/image';
import ImageUpload from '../ImageUpload';
import { STATES_CITIES } from '@/lib/locations';

interface EditProfileFormProps {
    form: any;
    setForm: React.Dispatch<React.SetStateAction<any>>;
    onSubmit: (e: React.FormEvent) => void;
    submitting: boolean;
    user: any;
    defaults: { avatars: string[]; banners: string[] };
    mascot: {
        style: string;
        setStyle: (s: string) => void;
        seed: string;
        setSeed: (s: string) => void;
        bg: string;
        setBg: (s: string) => void;
    };
}

export default function EditProfileForm({ form, setForm, onSubmit, submitting, user, defaults, mascot }: EditProfileFormProps) {
    const mascotUrl = `https://api.dicebear.com/9.x/${mascot.style}/svg?seed=${mascot.seed}&backgroundColor=${mascot.bg}`;

    const generateRandomMascot = () => {
        const randomSeed = Math.random().toString(36).substring(7);
        mascot.setSeed(randomSeed);
    };

    const mascotStyles = [
        { id: 'notionists', label: 'Minimal', icon: '🎨' },
        { id: 'adventurer', label: 'Playful', icon: '🤠' },
        { id: 'fun-emoji', label: 'Emoji', icon: '😊' },
        { id: 'bottts', label: 'Robot', icon: '🤖' },
        { id: 'pixel-art', label: 'Retro', icon: '👾' }
    ];

    const bgPalettes = [
        { lab: 'Ocean', val: 'b6e3f4,c0aede,d1d4f9' },
        { lab: 'Sunset', val: 'ffdfbf,ffd5dc,d1d4f9' },
        { lab: 'Forest', val: 'c0aede,ffd5dc,ffdfbf' },
        { lab: 'Candy', val: 'ffd5dc,ffdfbf,b6e3f4' }
    ];

    return (
        <form onSubmit={onSubmit} className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 italic mb-2 ml-4">Edit Profile</h3>
            <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/50 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-10 shadow-sm space-y-12">
                
                {/* Mascot Studio */}
                <div className="bg-indigo-600 rounded-[2rem] overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <div className="relative z-10 p-6 sm:p-10 flex flex-col lg:flex-row items-center gap-10">
                        <div className="relative shrink-0 group">
                            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
                                <NextImage src={mascotUrl} alt="Preview" fill unoptimized className="object-cover" />
                            </div>
                            <button 
                                type="button"
                                onClick={generateRandomMascot}
                                className="absolute -bottom-2 -right-2 w-10 h-10 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:rotate-180 transition-transform duration-500 active:scale-90"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 space-y-6 text-center lg:text-left text-white">
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter leading-none mb-2">Mascot Studio</h3>
                                <p className="text-indigo-100 text-xs font-bold opacity-80">Design your unique digital identity.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-3 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-indigo-200/60 ml-1">Style</label>
                                    <div className="flex flex-wrap gap-2">
                                        {mascotStyles.map(s => (
                                            <button key={s.id} type="button" onClick={() => mascot.setStyle(s.id)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mascot.style === s.id ? 'bg-white text-indigo-600' : 'bg-white/10 text-white hover:bg-white/20'}`}>{s.icon} {s.label}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-indigo-200/60 ml-1">Palette</label>
                                    <div className="flex flex-wrap gap-2">
                                        {bgPalettes.map(p => (
                                            <button key={p.lab} type="button" onClick={() => mascot.setBg(p.val)} className={`w-8 h-8 rounded-full border-2 transition-all ${mascot.bg === p.val ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ background: `linear-gradient(135deg, #${p.val.split(',')[0]}, #${p.val.split(',')[2]})` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button type="button" onClick={() => setForm((p:any) => ({ ...p, profilePicture: mascotUrl }))} className="px-8 py-3 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-50 active:scale-95 transition-all">✨ Use Mascot</button>
                        </div>
                    </div>
                </div>

                {/* Avatar Selection */}
                <div className="space-y-6">
                    <h4 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white ml-2">🎭 Avatars</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-zinc-800/50">
                        {defaults.avatars?.map((url: string, idx: number) => (
                            <button key={idx} type="button" onClick={() => setForm((p: any) => ({ ...p, profilePicture: url }))} className={`relative aspect-square rounded-2xl overflow-hidden border-4 transition-all ${form.profilePicture === url ? 'border-indigo-600 scale-105 shadow-xl' : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800'}`}>
                                <NextImage src={url} alt={`Avatar ${idx}`} fill unoptimized={url.includes('dicebear')} className="object-cover" />
                            </button>
                        ))}
                        <div className="relative aspect-square cursor-pointer" onClick={() => (document.querySelector('input[type="file"]') as any)?.click()}>
                            <ImageUpload label="" folder="recircle/profiles" currentImage={!defaults.avatars.includes(form.profilePicture) ? form.profilePicture : ''} onUpload={(url) => setForm((p: any) => ({ ...p, profilePicture: url }))} className="w-full h-full" imageClassName="rounded-2xl object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xl">+</div></div>
                        </div>
                    </div>
                </div>

                {/* Banner Selection */}
                <div className="space-y-6">
                    <h4 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white ml-2">🖼️ Banners</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-zinc-800/50">
                        {defaults.banners?.map((url: string, idx: number) => (
                            <button key={idx} type="button" onClick={() => setForm((p: any) => ({ ...p, bannerImage: url }))} className={`relative aspect-video rounded-2xl overflow-hidden border-4 transition-all ${form.bannerImage === url ? 'border-indigo-600 scale-105 shadow-xl' : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800'}`}>
                                <NextImage src={url} alt={`Banner ${idx}`} fill unoptimized className="object-cover" />
                            </button>
                        ))}
                        <div className="relative aspect-video cursor-pointer" onClick={() => (document.querySelectorAll('input[type="file"]')[1] as any)?.click()}>
                            <ImageUpload label="" folder="recircle/banners" currentImage={!defaults.banners.includes(form.bannerImage) ? form.bannerImage : ''} onUpload={(url) => setForm((p: any) => ({ ...p, bannerImage: url }))} className="w-full h-full" imageClassName="rounded-2xl object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xl">+</div></div>
                        </div>
                    </div>
                </div>

                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 italic">Full Name</label>
                            <span className={`text-[9px] font-bold ${form.name.length < 3 ? 'text-rose-500' : 'text-zinc-400'}`}>
                                {form.name.length}/30
                            </span>
                        </div>
                        <input 
                            type="text" 
                            required 
                            value={form.name} 
                            minLength={3} 
                            maxLength={30} 
                            onChange={(e) => setForm((p:any) => ({ ...p, name: e.target.value }))} 
                            className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl py-4 px-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-zinc-900 dark:text-white border border-transparent focus:border-indigo-100" 
                        />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 italic">Username</label>
                            <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-bold ${form.username.length < 3 ? 'text-rose-500' : 'text-zinc-400'}`}>
                                    {form.username.length}/20
                                </span>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${(user?.usernameChangeCount || 0) >= 3 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                    {user?.usernameChangeCount || 0}/3 Changes
                                </span>
                            </div>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-indigo-500">@</span>
                            <input 
                                type="text" 
                                value={form.username} 
                                maxLength={20} 
                                disabled={(user?.usernameChangeCount || 0) >= 3} 
                                onChange={(e) => setForm((p:any) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').trim() }))} 
                                className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl py-4 pl-12 pr-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all disabled:opacity-50 text-zinc-900 dark:text-white border border-transparent focus:border-indigo-100" 
                                placeholder="unique_username"
                            />
                        </div>
                        {(user?.usernameChangeCount || 0) >= 3 && (
                            <p className="text-[8px] font-bold text-rose-500 ml-2 uppercase tracking-widest">Username change limit reached.</p>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 italic">Phone Number</label>
                            <span className={`text-[9px] font-bold ${form.phone.length !== 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {form.phone.length === 10 ? '✓ Valid' : `${form.phone.length}/10 digits`}
                            </span>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400">+91</span>
                            <input 
                                type="tel" 
                                required
                                value={form.phone} 
                                maxLength={10}
                                minLength={10}
                                onChange={(e) => setForm((p:any) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} 
                                className={`w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl py-4 pl-14 pr-5 text-[11px] font-black outline-none focus:ring-2 transition-all text-zinc-900 dark:text-white border ${form.phone.length > 0 && form.phone.length < 10 ? 'border-rose-200 ring-rose-50' : 'border-transparent focus:border-indigo-100 focus:ring-indigo-200'}`} 
                                placeholder="9876543210" 
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 ml-2 italic">Gender</label>
                        <select 
                            value={form.gender} 
                            onChange={(e) => setForm((p:any) => ({ ...p, gender: e.target.value }))}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl py-4 px-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-zinc-900 dark:text-white border border-transparent focus:border-indigo-100 appearance-none"
                        >
                            <option value="none">Prefer not to say</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 ml-2 italic">State</label>
                        <select 
                            value={form.state} 
                            onChange={(e) => setForm((p:any) => ({ ...p, state: e.target.value, city: '' }))}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl py-4 px-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-zinc-900 dark:text-white border border-transparent focus:border-indigo-100 appearance-none"
                        >
                            <option value="">Select State</option>
                            {Object.keys(STATES_CITIES).map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 ml-2 italic">City</label>
                        <select 
                            value={form.city} 
                            disabled={!form.state}
                            onChange={(e) => setForm((p:any) => ({ ...p, city: e.target.value }))}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl py-4 px-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-zinc-900 dark:text-white border border-transparent focus:border-indigo-100 appearance-none disabled:opacity-40"
                        >
                            <option value="">Select City</option>
                            {form.state && (STATES_CITIES as any)[form.state]?.map((city: string) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3 md:col-span-2">
                        <div className="flex justify-between items-center ml-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 italic">Landmark / Area</label>
                            <span className={`text-[9px] font-bold ${(form.landmark?.length || 0) > 90 ? 'text-amber-500' : 'text-zinc-400'}`}>
                                {(form.landmark?.length || 0)}/100
                            </span>
                        </div>
                        <input 
                            type="text" 
                            value={form.landmark} 
                            maxLength={100} 
                            onChange={(e) => setForm((p:any) => ({ ...p, landmark: e.target.value }))} 
                            className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl py-4 px-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-zinc-900 dark:text-white border border-transparent focus:border-indigo-100" 
                            placeholder="e.g., Near City Mall, Opp. Metro Station" 
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 italic">Bio</label>
                        <span className={`text-[9px] font-bold ${form.bio.length > 450 ? 'text-amber-500' : 'text-zinc-400'}`}>
                            {form.bio.length}/500
                        </span>
                    </div>
                    <textarea 
                        rows={4} 
                        maxLength={500} 
                        value={form.bio} 
                        onChange={(e) => setForm((p:any) => ({ ...p, bio: e.target.value }))} 
                        className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-3xl py-5 px-6 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-zinc-900 dark:text-white border border-transparent focus:border-indigo-100" 
                        placeholder="Tell the community about yourself..."
                    />
                </div>
            </div>
        </form>
    );
}
