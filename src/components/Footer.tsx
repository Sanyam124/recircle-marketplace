'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/config';

export default function Footer() {
  const pathname = usePathname();
  
  // Hide footer on full-height pages
  if (pathname.startsWith('/chat')) return null;

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">R</span>
              </div>
              <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">ReCircle</span>
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              The open community marketplace for students to securely trade essentials and offer freelance services on campus.
            </p>
            <div className="flex items-center gap-2">
              <a href={`mailto:${siteConfig.supportEmail}`} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {siteConfig.supportEmail}
              </a>
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Marketplace</h4>
            <ul className="space-y-2.5">
              <li><Link href="/explore" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Explore</Link></li>
              <li><Link href="/products/create" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Sell a Product</Link></li>
              <li><Link href="/services/create" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Offer a Service</Link></li>
              <li><Link href="/board" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Community Board</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Account</h4>
            <ul className="space-y-2.5">
              <li><Link href="/settings" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Settings</Link></li>
              <li><Link href="/orders" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">My Orders</Link></li>
              <li><Link href="/chat" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Messages</Link></li>
              <li><Link href="/wishlist" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Wishlist</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Company</h4>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact Us</Link></li>
              <li><Link href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/disclaimer" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} ReCircle. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Terms</Link>
            <span>·</span>
            <Link href="/disclaimer" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Disclaimer</Link>
            <span>·</span>
            <Link href="/contact" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
