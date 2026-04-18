'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/config';

export default function Footer() {
  const pathname = usePathname();
  
  // 📍 Define pages where the footer is treated as a professional necessity (Landing/Legal)
  const staticPages = ['/', '/about', '/contact', '/privacy', '/terms', '/disclaimer'];
  const isStaticPage = staticPages.includes(pathname);

  // 🚫 Completely hide footer on interactive app hulls
  if (pathname.startsWith('/chat') || pathname.startsWith('/board')) return null;

  // 📱 For App sections (Explore, Profile, Settings etc), hide on mobile for a native-app feel
  const visibilityClass = isStaticPage ? "block" : "hidden sm:block";

  return (
    <footer className={`${visibilityClass} bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 sm:pb-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group">
              <div className="relative w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center overflow-hidden shadow-indigo-200 dark:shadow-none shadow-lg group-hover:scale-110 transition-transform">
                <Image 
                  src="/logo_main.png" 
                  alt="ReCircle" 
                  fill 
                  sizes="40px"
                  priority
                  className="object-cover p-2 brightness-0 invert" 
                />
              </div>
              <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">ReCircle</span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 max-w-xs">
              Empowering campus communities through secure, sustainable trading and peer-to-peer services.
            </p>
            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Need help?</span>
              <a href={`mailto:${siteConfig.supportEmail}`} className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Contact Support
              </a>
            </div>
          </div>

          {/* Marketplace */}
          <div className="col-span-1 lg:pl-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-6">Marketplace</h4>
            <ul className="space-y-4">
              <li><Link href="/explore" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Explore Feed</Link></li>
              <li><Link href="/products/create" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Sell Product</Link></li>
              <li><Link href="/services/create" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Offer Service</Link></li>
              <li><Link href="/board" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Circle Board</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div className="col-span-1 lg:pl-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-6">Account</h4>
            <ul className="space-y-4">
              <li><Link href="/settings" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Settings</Link></li>
              <li><Link href="/orders" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">My Orders</Link></li>
              <li><Link href="/chat" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Messages</Link></li>
              <li><Link href="/wishlist" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Wishlist</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="col-span-2 lg:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-6">Legal & Company</h4>
            <ul className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <li><Link href="/about" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">About Us</Link></li>
              <li><Link href="/contact" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Contact Us</Link></li>
              <li><Link href="/privacy" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Terms of Service</Link></li>
              <li className="lg:hidden"><Link href="/disclaimer" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              © {new Date().getFullYear()} ReCircle. Built for Campus Communities.
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600">
              All transactions are subject to local marketplace guidelines.
            </p>
          </div>
          
          <div className="flex items-center gap-6 text-[11px] font-bold text-gray-400 dark:text-gray-500">
            <Link href="/disclaimer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Disclaimer</Link>
            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full hidden sm:block"></div>
            <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors md:hidden lg:inline">Privacy</Link>
            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full hidden sm:block lg:hidden"></div>
            <Link href="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Help Center</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
