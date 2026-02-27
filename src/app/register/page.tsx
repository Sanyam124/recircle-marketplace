'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // Username status
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Verification State
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailToken, setEmailToken] = useState('');
  const [googleToken, setGoogleToken] = useState('');

  useEffect(() => {
    // Load Google One Tap Script
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
        } catch (e) {
            // ignore
        }
    }
  }, []);

  // Handle Google Data from Login Page (sessionStorage)
  useEffect(() => {
    const storedData = sessionStorage.getItem('googleData');
    if (storedData) {
        try {
            const googleData = JSON.parse(storedData);
            setFormData(prev => ({
                ...prev,
                name: googleData.name || '',
                email: googleData.email || '',
            }));
            setEmailVerified(true);
            if (googleData.googleToken) {
                setGoogleToken(googleData.googleToken);
            }
            // Clear it so it doesn't persist on refresh if they want to start fresh
            sessionStorage.removeItem('googleData');
            alert('Google profile linked! Please choose your username and password.');
        } catch (e) {
            console.error('Failed to parse google data');
        }
    }
  }, []);

  // Check Username Availability
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.username.length >= 1) {
        setIsCheckingUsername(true);
        try {
          const res = await fetch(`/api/auth/username-check?username=${formData.username}`);
          const data = await res.json();
          setUsernameAvailable(data.available);
        } catch (e) {
          console.error('Username check failed');
        } finally {
          setIsCheckingUsername(false);
        }
      } else {
        setUsernameAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

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
            setFormData({
                ...formData,
                name: data.googleData.name || '',
                email: data.googleData.email || '',
            });
            setEmailVerified(true);
            setGoogleToken(response.credential);
            // For now, email verification is enough to trust the registration
            alert('Google profile linked! Please choose your username and password to finish.');
        } else {
            // Direct login for existing user
            login(data.user);
        }
    } catch (err: any) {
        setError(err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Only trim username and email, allow spaces in name for typing
    const updatedValue = (name === 'username' || name === 'email') ? value.trim() : value;
    
    setFormData({ ...formData, [name]: updatedValue });
    setError('');
  };

  const sendOtp = async () => {
      if (!formData.email) {
          setError('Please enter your email first.');
          return;
      }

      setIsLoading(true);
      setError('');

      try {
          const res = await fetch('/api/auth/otp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target: formData.email, type: 'email' })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setEmailOtpSent(true);
          alert(`OTP sent to ${formData.email}`);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const verifyOtp = async () => {
      if (!emailOtp) {
          setError('Please enter the OTP.');
          return;
      }

      setIsLoading(true);
      setError('');

      try {
          const res = await fetch('/api/auth/otp/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target: formData.email, otp: emailOtp, type: 'email' })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setEmailVerified(true);
          setEmailToken(data.token);
          setEmailOtpSent(false);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
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
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          emailToken,
          googleToken
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      login(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-lg space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 font-outfit">
            Join ReCircle
          </h2>
          <p className="mt-2 text-sm text-gray-600">
             The community-driven marketplace for everyone.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700">Username</label>
              <div className="mt-1 relative">
                <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className={`block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border ${
                        usernameAvailable === true ? 'border-green-500' : usernameAvailable === false ? 'border-red-500' : ''
                    }`}
                    value={formData.username}
                    onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
                        setFormData({ ...formData, username: val });
                    }}
                    placeholder="johndoe123"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {isCheckingUsername && <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />}
                    {usernameAvailable === true && <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                    {usernameAvailable === false && <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>}
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400 font-medium">4-20 chars, start w/ letter, no consecutive '.' or '_'. <b>Cannot be changed later.</b></p>
              {usernameAvailable === false && <p className="mt-1 text-xs text-red-500">Username already taken or invalid format</p>}
            </div>

            {/* Email + Verify */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">Email Address</label>
              <div className="mt-1 flex gap-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    readOnly={emailVerified || emailOtpSent}
                    placeholder="you@example.com"
                    className={`block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border ${emailVerified ? 'bg-green-50 border-green-200' : ''}`}
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {!emailVerified && !emailOtpSent && (
                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={isLoading || !formData.email}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                          Verify
                      </button>
                  )}
                  {emailVerified && <span className="flex items-center text-green-600 px-3 font-bold text-xs uppercase tracking-wider">Verified</span>}
              </div>
              
              {emailOtpSent && !emailVerified && (
                  <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-2">
                       <input
                        type="text"
                        placeholder="6-digit OTP"
                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border bg-gray-50 text-center tracking-[0.5em] font-bold"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                      />
                       <button
                        type="button"
                        onClick={verifyOtp}
                        disabled={isLoading}
                        className="bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition-all"
                      >
                          Confirm
                      </button>
                  </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password */}
                <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border"
                    value={formData.password}
                    onChange={handleChange}
                />
                </div>
                <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">Confirm</label>
                <div className="relative">
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        className={`mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border transition-all ${
                            formData.confirmPassword && formData.password === formData.confirmPassword 
                            ? 'border-green-500 bg-green-50 shadow-[0_0_0_1px_rgba(34,197,94,0.1)]' 
                            : formData.confirmPassword && formData.password !== formData.confirmPassword 
                            ? 'border-red-300' 
                            : ''
                        }`}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                    />
                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-green-500 animate-in zoom-in" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </div>
                </div>
            </div>

          </div>

          {error && (
            <div className="text-red-600 text-sm py-3 px-4 rounded-xl bg-red-50 border border-red-100 animate-shake">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || !emailVerified || !usernameAvailable}
              className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold tracking-wider uppercase text-white transition-all transform active:scale-[0.98] ${
                  isLoading || !emailVerified || !usernameAvailable ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500 font-medium italic">or join with</span>
            </div>
        </div>

        <div id="googleSignInBtn" className="w-full mb-6"></div>
        
        <div className="text-center text-sm mt-6">
            <p className="text-gray-500">
                Already part of the community?{' '}
                <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    Sign in here
                </Link>
            </p>
        </div>

      </div>
    </div>
  );
}
