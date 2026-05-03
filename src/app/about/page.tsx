import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about ReCircle — the campus marketplace built by students, for students. Discover our mission, full feature set, and the team behind the platform.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 sm:px-10 py-12 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-black text-white">R</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">About ReCircle</h1>
          <p className="text-indigo-200 text-sm mt-3 font-medium max-w-xl mx-auto">Built by students, for students — a safer, smarter way to trade and freelance on campus.</p>
        </div>

        <div className="px-6 sm:px-10 py-8 space-y-8">
          {/* Mission */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Our Mission</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                ReCircle is a community-driven marketplace designed specifically for college students. We believe that campus life generates an enormous amount of reusable goods — from textbooks and electronics to furniture and fashion. Instead of letting these items go to waste, ReCircle provides a trusted, zero-fee platform where students can buy, sell, rent, and trade within their verified campus community, while also offering their freelance skills to peers.
              </p>
            </div>
          </div>

          {/* What We Offer */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">What We Offer</h2>
              <ul className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2">
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Product Marketplace:</strong> Buy, sell, and rent physical goods — electronics, textbooks, clothing, furniture, hostel essentials, and more. Listings support multiple images, detailed descriptions, condition tags, and flexible pricing for both sale and rental.</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Service Marketplace:</strong> Offer or hire freelance services — tutoring, graphic design, photography, tech support, room cleaning, event organizing, and more. Set your rates by hour, project, or session.</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Community Circles:</strong> Verified communities tied to your college, university, or organization. Once your email is verified, you gain access to exclusive, community-only listings with hostel/building location filtering.</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Circle Board:</strong> A campus-wide bulletin board to post announcements, find roommates, share events, lost &amp; found notices, and connect with your community beyond buying and selling.</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Real-Time Chat:</strong> Negotiate and finalize deals with instant messaging, complete with read receipts, online status indicators, and full conversation history.</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Offer &amp; Order System:</strong> Send structured price offers on products, negotiate directly, and track the entire order lifecycle from offer to completion with built-in dispute resolution.</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Reviews &amp; Ratings:</strong> Leave and receive reviews after completed transactions to build trust and reputation within the community.</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Wishlist:</strong> Save your favourite products and services to a personal wishlist for easy access later.</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Push Notifications:</strong> Receive real-time browser notifications for new messages, offers, and order updates so you never miss a deal.</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Location &amp; Map Integration:</strong> Browse listings on an interactive map, filter by state, city, and even specific hostel buildings within your campus.</span></li>
              </ul>
            </div>
          </div>

          {/* Safety & Trust */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Safety &amp; Trust</h2>
              <ul className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2">
                <li className="flex items-start gap-2"><span className="text-rose-500 font-bold mt-0.5">•</span><span><strong>Multi-Layer Verification:</strong> Email verification, OTP-based phone verification, and campus community verification through designated verifiers.</span></li>
                <li className="flex items-start gap-2"><span className="text-rose-500 font-bold mt-0.5">•</span><span><strong>Moderation System:</strong> Report inappropriate listings, users, or messages. Admin and community verifiers review reports and can take action including warnings and account bans.</span></li>
                <li className="flex items-start gap-2"><span className="text-rose-500 font-bold mt-0.5">•</span><span><strong>User Blocking:</strong> Block any user to prevent them from contacting you or seeing your listings.</span></li>
                <li className="flex items-start gap-2"><span className="text-rose-500 font-bold mt-0.5">•</span><span><strong>Privacy Controls:</strong> Full control over your email and phone visibility, online presence indicators, and vacation mode to temporarily hide your listings.</span></li>
                <li className="flex items-start gap-2"><span className="text-rose-500 font-bold mt-0.5">•</span><span><strong>Rate Limiting:</strong> Built-in anti-spam and abuse protection to keep the platform fair for everyone.</span></li>
              </ul>
            </div>
          </div>

          {/* Why ReCircle */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Why ReCircle?</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Unlike generic marketplaces, ReCircle is built around verified campus communities. Students join their university&apos;s Circle through a verifier-approved process, creating a trusted network of buyers and sellers who are physically nearby. This means easier meetups, zero shipping costs, zero platform fees, stronger community bonds, and a sustainable approach to campus commerce. With support for both products and services, dark/light themes, customizable grid layouts, and default landing preferences — ReCircle adapts to how you want to trade.
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 text-center">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Get In Touch</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">Have questions, suggestions, or partnership inquiries?</p>
            <a href={`mailto:${siteConfig.supportEmail}`} className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {siteConfig.supportEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
