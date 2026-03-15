'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthPage() {
    // --- State ---
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1 = Email, 2 = Login, 3 = Register
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Registration State
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [emailOtp, setEmailOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [emailToken, setEmailToken] = useState('');
    const [googleToken, setGoogleToken] = useState('');
    const [emailError, setEmailError] = useState('');

    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/';

    const passwordInputRef = useRef<HTMLInputElement>(null);

    // --- Google Sign In ---
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        script.onload = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                });
                const btn = document.getElementById('googleSignInBtn');
                if (btn) {
                    window.google.accounts.id.renderButton(
                        btn,
                        { theme: 'outline', size: 'large', width: '100%' }
                    );
                }
            }
        };

        return () => {
            try {
                document.body.removeChild(script);
            } catch (e) {}
        }
    }, [step]); // Re-render button if we go back to step 1

    const handleGoogleCallback = async (response: any) => {
        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (data.exists === false) {
                // Auto-fill form for new user
                setEmail(data.googleData.email || '');
                setName(data.googleData.name || '');
                setEmailVerified(true);
                setGoogleToken(response.credential);
                setStep(3); // Go to registration step
                setError('');
            } else {
                // Direct login for existing user
                login(data.user);
                router.push(redirectUrl);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    // --- User Validation Effects ---
    useEffect(() => {
        const timer = setTimeout(async () => {
          if (step !== 3 || username.length < 3) {
             setUsernameAvailable(null);
             setIsCheckingUsername(false);
             return;
          }
            
          setIsCheckingUsername(true);
          try {
            const res = await fetch(`/api/auth/username-check?username=${username}`);
            const data = await res.json();
            setUsernameAvailable(data.available);
          } catch (e) {
            console.error('Username check failed');
            setUsernameAvailable(null);
          } finally {
            setIsCheckingUsername(false);
          }
          
        }, 300);
    
        return () => clearTimeout(timer);
    }, [username, step]);


    // --- Actions ---
    
    // Step 1: Check Email
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            
            if (data.exists) {
                setStep(2); // Go to Login
                // Focus password input on next tick
                setTimeout(() => passwordInputRef.current?.focus(), 100);
            } else {
                setStep(3); // Go to Registration
            }
        } catch (err: any) {
            setError('Failed to check email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Login Submit
    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: email, password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            login(data.user);
            router.push(redirectUrl);
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    // Step 3: Registration Submit & OTP Actions
    const sendOtp = async () => {
        setIsLoading(true);
        setError('');
        setEmailError('');
  
        try {
            const res = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: email, type: 'email' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
  
            setEmailOtpSent(true);
            alert(`OTP sent to ${email}`);
        } catch (err: any) {
            setEmailError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
  
    const verifyOtp = async () => {
        if (!emailOtp) {
            setEmailError('Please enter the OTP.');
            return;
        }
  
        setIsLoading(true);
        setEmailError('');
  
        try {
            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: email, otp: emailOtp, type: 'email' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
  
            setEmailVerified(true);
            setEmailToken(data.token);
            setEmailOtpSent(false);
        } catch (err: any) {
            setEmailError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!usernameAvailable) {
            setError('Please choose a valid/available username');
            return;
        }
        if (!emailVerified || (!emailToken && !googleToken)) {
            setError('Please verify your email address to continue.');
            return;
        }
        
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    username: username.trim().toLowerCase(),
                    email: email.trim().toLowerCase(),
                    password,
                    emailToken,
                    googleToken
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            login(data.user);
            router.push(redirectUrl);
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };


    // --- Renderers ---

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950 transition-colors">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 transition-colors animate-in fade-in zoom-in-95 duration-300">
                
                {/* Header Phase */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-outfit">
                        {step === 1 ? 'Welcome to ReCircle' : step === 2 ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {step === 1 && 'Enter your email to sign in or create an account'}
                        {step === 2 && 'Enter your password to sign in'}
                        {step === 3 && 'Just a few more details to join the community'}
                    </p>
                </div>

                {/* --- Step 1: Email Only --- */}
                {step === 1 && (
                    <form className="mt-8 space-y-6" onSubmit={handleEmailSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value.replace(/[\r\n]/g, '').trim());
                                    setError('');
                                }}
                                className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>

                        {error && <div className="text-red-600 dark:text-red-400 text-sm py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20">{error}</div>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold tracking-wide text-white transition-all transform active:scale-[0.98] ${
                                isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {isLoading ? 'Checking...' : 'Continue'}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
                            <div className="relative flex justify-center text-sm"><span className="bg-white dark:bg-gray-900 px-4 text-gray-500 dark:text-gray-400 italic">or continue with</span></div>
                        </div>

                        <div id="googleSignInBtn" className="w-full"></div>
                    </form>
                )}


                {/* --- Step 2: Login (Password) --- */}
                {step === 2 && (
                    <form className="mt-8 space-y-6 animate-in slide-in-from-right-4 duration-300" onSubmit={handleLoginSubmit}>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center mb-6">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-4">{email}</span>
                            <button type="button" onClick={() => {setStep(1); setPassword(''); setError('');}} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 uppercase shrink-0">Edit</button>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Password
                                </label>
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                ref={passwordInputRef}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && <div className="text-red-600 dark:text-red-400 text-sm py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20">{error}</div>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold tracking-wide text-white transition-all transform active:scale-[0.98] ${
                                isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                )}

                {/* --- Step 3: Registration --- */}
                {step === 3 && (
                    <form className="mt-8 space-y-5 animate-in slide-in-from-right-4 duration-300" onSubmit={handleRegisterSubmit}>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-4">{email}</span>
                            {!emailVerified && <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest shrink-0">Verification Required</span>}
                            {emailVerified && <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest shrink-0">Verified ✓</span>}
                            {!emailVerified && !emailOtpSent && (
                                <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 ml-3">EDIT</button>
                            )}
                        </div>

                        {!emailVerified && (
                           <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4">
                               <p className="text-xs text-indigo-800 dark:text-indigo-300 mb-3 font-medium">Please verify your email to create an account.</p>
                               {!emailOtpSent ? (
                                   <button type="button" onClick={sendOtp} disabled={isLoading} className="w-full bg-indigo-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-indigo-700 transition">Send Verification Code</button>
                               ) : (
                                   <div className="flex gap-2">
                                       <input type="text" placeholder="6-digit code" className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 sm:text-sm px-3 py-2 border text-center tracking-widest font-bold" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} />
                                       <button type="button" onClick={verifyOtp} disabled={isLoading} className="bg-green-600 text-white px-4 rounded-lg font-bold text-sm hover:bg-green-700 transition">Verify</button>
                                   </div>
                               )}
                               {emailError && <p className="mt-2 text-xs text-red-500 font-bold">{emailError}</p>}
                           </div>
                        )}

                        <div className={`space-y-4 transition-all duration-300 ${!emailVerified ? 'opacity-50 pointer-events-none filter blur-[1px]' : ''}`}>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                <input type="text" required maxLength={30} value={name} onChange={(e) => setName(e.target.value)}
                                    className="block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border"
                                    placeholder="John Doe" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                <div className="relative">
                                    <input type="text" maxLength={20} value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[\r\n]/g, '').replace(/[^a-z0-9._]/g, ''))}
                                        className={`block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border ${
                                            usernameAvailable === true ? 'border-green-500 focus:border-green-500 ring-green-500' : (usernameAvailable === false || (username.length > 0 && username.length < 3)) ? 'border-red-500 focus:border-red-500 ring-red-500' : ''
                                        }`}
                                        placeholder="johndoe123" />
                                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        {isCheckingUsername && <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />}
                                        {usernameAvailable === true && username.length >= 3 && <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>}
                                    </div>
                                </div>
                                <p className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium">3-20 chars, lowercase alphanumeric, underscores, dots.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Confirm</label>
                                    <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`block w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border ${
                                            confirmPassword && password === confirmPassword ? 'border-green-500' : confirmPassword ? 'border-red-400' : ''
                                        }`} />
                                </div>
                            </div>
                        </div>

                        {error && <div className="text-red-600 dark:text-red-400 text-sm py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20 mt-4">{error}</div>}

                        <button
                            type="submit"
                            disabled={isLoading || !emailVerified || !usernameAvailable || name.length < 3}
                            className={`w-full flex justify-center py-3.5 px-4 mt-6 border border-transparent rounded-xl shadow-md text-sm font-bold tracking-wide text-white transition-all transform active:scale-[0.98] ${
                                isLoading || !emailVerified || !usernameAvailable || name.length < 3 ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
