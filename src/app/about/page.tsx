import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about ReCircle — the campus marketplace built by students, for students. Our mission, vision, and team.',
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
          <p className="text-indigo-200 text-sm mt-3 font-medium max-w-xl mx-auto">Built by students, for students — a safer, smarter way to trade on campus.</p>
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
                ReCircle is a community-driven marketplace designed specifically for college students. We believe that campus life generates an enormous amount of reusable goods — from textbooks and electronics to furniture and fashion. Instead of letting these items go to waste, ReCircle provides a trusted platform where students can buy, sell, and trade within their verified campus community.
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
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold">•</span> <strong>Product Marketplace:</strong> Buy and sell physical goods — electronics, books, clothing, accessories, and more.</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold">•</span> <strong>Service Marketplace:</strong> Offer or hire freelance services — tutoring, design, photography, tech support, etc.</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold">•</span> <strong>Community Board:</strong> Post announcements, find roommates, share events, and connect with your campus.</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold">•</span> <strong>Real-Time Chat:</strong> Negotiate, discuss, and finalize deals directly with other students.</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold">•</span> <strong>Secure Transactions:</strong> Built-in offer system, order tracking, and dispute resolution.</li>
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
                Unlike generic marketplaces, ReCircle is built around campus communities. Users are verified through their university email, creating a trusted network of buyers and sellers who are physically nearby. This means easier meetups, lower shipping costs, and a stronger sense of community.
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
