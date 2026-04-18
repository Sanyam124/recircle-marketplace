'use client';

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StartEarningModal from "@/components/StartEarningModal";
import { getIcon } from "@/components/Icons";
import { siteConfig } from "@/lib/config";

function CategoryGrid({ 
  title, subtitle, categories, baseUrl 
}: { 
  title: string; subtitle: string; baseUrl: string;
  categories: { name: string; filterName?: string; icon: string; color: string }[];
}) {
  return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl transition-colors">{title}</h2>
            <p className="mt-2 text-lg leading-8 text-gray-600 dark:text-gray-400 transition-colors">{subtitle}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {categories.map((category) => (
                <Link 
                    key={category.name} 
                    href={`/explore?type=${baseUrl}&category=${encodeURIComponent(category.filterName || category.name)}`}
                    className="group flex flex-col items-center justify-center p-4 sm:p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
                >
                    <div className={`h-12 w-12 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center mb-4 ${category.color} group-hover:scale-110 transition-transform`}>
                        {getIcon(category.icon)}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-center text-sm sm:text-base">{category.name}</span>
                </Link>
            ))}
        </div>
      </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [earningModalOpen, setEarningModalOpen] = useState(false);
  // Notification moved to Navbar for global visibility

  const handleStartEarning = () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setEarningModalOpen(true);
  };

    return (
      <div className="bg-white dark:bg-gray-900 transition-colors duration-300 min-h-screen overflow-x-clip">
        {/* 
          HERO SECTION 
          - Centered, Symmetrical, Modern Gradient
        */}
        <div className="relative isolate pt-14">
          <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
        
        <div className="py-20 sm:py-32 lg:pb-40 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 dark:bg-indigo-400"></span>
                 </span>
                 <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">The #1 Campus Hub</span>
              </div>
              
              <h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-black tracking-tighter text-gray-900 dark:text-white leading-[1.05] drop-shadow-sm mb-6">
                The Student's <br className="hidden sm:block" />
                <span className="relative inline-block mt-2 sm:mt-0">
                   <span className="absolute -inset-2 rounded-full bg-indigo-500/20 blur-2xl"></span>
                   <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Marketplace.</span>
                </span>
              </h1>
              
              <div className="mb-10 flex flex-wrap justify-center items-center gap-2 sm:gap-4 font-black tracking-widest uppercase text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">
                  <span className="px-5 py-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 transition-transform cursor-default">Buy</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  <span className="px-5 py-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 transition-transform cursor-default">Sell</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  <span className="px-5 py-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 transition-transform cursor-default">Rent</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  <span className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 hover:-translate-y-1 transition-transform cursor-default">Freelance</span>
              </div>
              
              <p className="text-lg sm:text-xl leading-relaxed text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium">
                ReCircle is the open campus platform for students to exchange goods and skills within verified communities. Keep 100% of your earnings.
              </p>
              
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <Link
                  href="/explore"
                  className="w-full sm:w-auto rounded-2xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:shadow-indigo-500/50 transition-all hover:scale-105 active:scale-95"
                >
                  Start Exploring 🔍
                </Link>
                <button
                  onClick={handleStartEarning}
                  className="w-full sm:w-auto rounded-2xl bg-white dark:bg-gray-800/80 px-8 py-4 text-base font-bold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 cursor-pointer flex justify-center items-center gap-2 group"
                >
                  Start Earning ✨ <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>
            
            {/* Trust Banner - Qualitative */}
            <div className="mt-16 sm:mt-24">
              <dl className="grid grid-cols-1 gap-4 text-center lg:grid-cols-3">
                <div className="mx-auto flex max-w-sm flex-col gap-y-2 px-8 py-10 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors">
                  <dd className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">💸 Zero Platform Fees</dd>
                  <dt className="text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400">Keep 100% of your earnings. No hidden charges or listing fees for buyers, sellers, or freelancers.</dt>
                </div>
                <div className="mx-auto flex max-w-sm flex-col gap-y-2 px-8 py-10 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors">
                  <dd className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">🤝 Direct Peer-to-Peer</dd>
                  <dt className="text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400">Negotiate, meet up on campus, and exchange goods or services directly without middlemen.</dt>
                </div>
                <div className="mx-auto flex max-w-sm flex-col gap-y-2 px-8 py-10 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors">
                  <dd className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">🎓 Campus Focused</dd>
                  <dt className="text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400">Built exclusively for students to easily exchange textbooks, sell essentials, and offer skills locally.</dt>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORIES SECTION */}
      <CategoryGrid 
        title="Browse by Category"
        subtitle="Find exactly what you need for your semester."
        baseUrl="products"
        categories={[
            { name: "Textbooks", icon: "book-open", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" },
            { name: "Study Notes", icon: "document-text", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30" },
            { name: "Electronics & Gadgets", icon: "computer-desktop", color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30" },
            { name: "Furniture", icon: "home", color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30" },
            { name: "Clothing & Accessories", icon: "shopping-bag", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30" },
            { name: "Other", icon: "queue-list", color: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800" },
        ]}
      />

      {/* SERVICE CATEGORIES SECTION */}
      <CategoryGrid 
        title="Hire Student Services"
        subtitle="Find talented peers for tutoring, design, repairs & more."
        baseUrl="services"
        categories={[
            { name: "Academic Help", filterName: "Academic Help (Tutoring, Notes)", icon: "academic-cap", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30" },
            { name: "Tech Support", filterName: "Tech Support & Repairs", icon: "computer-desktop", color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30" },
            { name: "Design & Edits", filterName: "Graphic Design & Editing", icon: "paint-brush", color: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30" },
            { name: "Photo & Video", filterName: "Photography & Videography", icon: "camera", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30" },
            { name: "Room Services", filterName: "Dorm & Room Services (Cleaning, Moving)", icon: "sparkles", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30" },
            { name: "Other Services", filterName: "Other", icon: "queue-list", color: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800" },
        ]}
      />

      {/* CAMPUS CIRCLES HIGHLIGHT */}
      <div className="bg-gradient-to-b from-white to-indigo-50/50 dark:from-gray-900 dark:to-indigo-950/20 transition-colors py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-8 sm:p-16 shadow-2xl">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />
            
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/20">
                  <span className="text-lg">🔒</span>
                  <span className="text-xs font-bold text-white uppercase tracking-widest">Exclusive Feature</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-4">
                  Campus Circles
                </h2>
                <p className="text-indigo-100 text-base sm:text-lg leading-relaxed mb-8">
                  Join your community's verified circle to unlock exclusive, campus or workplace-only listings. Get auto-verified instantly if your email matches your domain — or request approval from a verifier. Trade within a trusted network and filter right down to your hostel/building.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <p className="text-2xl font-black text-white mb-1">🎓</p>
                    <p className="text-sm font-bold text-white">Auto &amp; Manual Verify</p>
                    <p className="text-xs text-indigo-200 mt-1">Email match or verifier approval</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <p className="text-2xl font-black text-white mb-1">🏢</p>
                    <p className="text-sm font-bold text-white">Hostel Filtering</p>
                    <p className="text-xs text-indigo-200 mt-1">Find items in your building</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <p className="text-2xl font-black text-white mb-1">📋</p>
                    <p className="text-sm font-bold text-white">Circle Board</p>
                    <p className="text-xs text-indigo-200 mt-1">Events, roommates, lost &amp; found</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                    <p className="text-sm font-bold text-white mb-1">🛡️ Verified Members Only</p>
                    <p className="text-xs text-indigo-200">No strangers — only real students</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                    <p className="text-sm font-bold text-white mb-1">📍 Hyperlocal Deals</p>
                    <p className="text-xs text-indigo-200">Trade with people next door</p>
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                    <p className="text-sm font-bold text-white mb-1">🔔 Smart Defaults</p>
                    <p className="text-xs text-indigo-200">Set your preferred circle &amp; hostel</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                    <p className="text-sm font-bold text-white mb-1">🌍 Global + Local</p>
                    <p className="text-xs text-indigo-200">Switch between campus &amp; public feed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES / VALUE PROP */}
      <div className="bg-white dark:bg-gray-900 transition-colors py-16 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
                <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Why ReCircle?</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">Everything You Need on Campus</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.375.665v.75c0 .621.504 1.125 1.125 1.125H21" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Zero Commission</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Keep 100% of your earnings. No listing fees, no platform cuts, no hidden charges — for buyers, sellers, and freelancers alike.</p>
                </div>

                {/* Feature 2 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Smart Offers &amp; Orders</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Send structured price offers, negotiate directly, and track every transaction from offer to completion with built-in order tracking and dispute resolution.</p>
                </div>

                {/* Feature 3 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Real-Time Chat</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Coordinate with instant messaging — read receipts, online status indicators, deal integration, and full conversation history right in the app.</p>
                </div>
                
                {/* Feature 4 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reviews &amp; Reputation</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Build your campus reputation with honest reviews and ratings from real transactions. Check seller profiles, review scores, and trade history before you buy.</p>
                </div>

                {/* Feature 5 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Safe &amp; Moderated</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Multi-layer security with email &amp; OTP verification, user blocking, content reporting, admin moderation, and community verifiers keeping the platform trusted.</p>
                </div>
                
                {/* Feature 6 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Wishlist &amp; Notifications</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Save favourite products and services to your wishlist. Get instant push notifications for new messages, offers, and order updates — never miss a deal.</p>
                </div>

                {/* Feature 7 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Location &amp; Maps</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Browse listings on an interactive map, filter by state, city, or even your specific hostel building. Sort by distance to find the closest deals instantly.</p>
                </div>

                {/* Feature 8 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                           <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Full Customization</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Dark &amp; light themes, adjustable grid density, default landing community, vacation mode, and granular privacy controls — your marketplace, your rules.</p>
                </div>

                {/* Feature 9 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Rich Listings</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Multi-image carousels, buy &amp; rent options, condition tags, category filters, and instant profile sharing. Everything you need to list it right and sell it fast.</p>
                </div>
            </div>
        </div>
      </div>

       {/* HOW IT WORKS */}
       <div className="bg-white dark:bg-gray-900 transition-colors py-16 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">How to Trade &amp; Hire on ReCircle</h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Turn your unused items into cash or offer your skills in four simple steps.</p>
                </div>
                
                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-8 left-[12%] right-[12%] h-0.5 bg-indigo-100 dark:bg-indigo-900/50 -z-10" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center relative z-10">
                        <div className="group relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm transition-all hover:-translate-y-2 hover:shadow-2xl rounded-3xl p-8 border border-gray-100 dark:border-gray-700">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-lg mb-6 ring-8 ring-indigo-50 dark:ring-indigo-900/30 group-hover:bg-indigo-500 transition-colors">1</div>
                            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Sign Up &amp; Verify</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Sign Up with your College/Organization Email. Join your Circle for exclusive access to verified, local listings.</p>
                        </div>
                        <div className="group relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm transition-all hover:-translate-y-2 hover:shadow-2xl rounded-3xl p-8 border border-gray-100 dark:border-gray-700">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-lg mb-6 ring-8 ring-indigo-50 dark:ring-indigo-900/30 group-hover:bg-indigo-500 transition-colors">2</div>
                            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Post or Discover</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">List products for sale or rent, offer your services, or explore what students near you are offering with rich filters and map view.</p>
                        </div>
                        <div className="group relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm transition-all hover:-translate-y-2 hover:shadow-2xl rounded-3xl p-8 border border-gray-100 dark:border-gray-700">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-lg mb-6 ring-8 ring-indigo-50 dark:ring-indigo-900/30 group-hover:bg-indigo-500 transition-colors">3</div>
                            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Chat &amp; Negotiate</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Message sellers directly, send price offers, discuss details, and agree on terms — all within the app with real-time notifications.</p>
                        </div>
                        <div className="group relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm transition-all hover:-translate-y-2 hover:shadow-2xl rounded-3xl p-8 border border-gray-100 dark:border-gray-700">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-lg mb-6 ring-8 ring-indigo-50 dark:ring-indigo-900/30 group-hover:bg-indigo-500 transition-colors">4</div>
                            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Meet &amp; Review</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Meet up on campus to exchange, complete the order, and leave a review to build your reputation in the community.</p>
                        </div>
                    </div>
                </div>
            </div>
       </div>
       
       {/* FEEDBACK SECTION */}
       <div className="bg-white dark:bg-gray-900 transition-colors pb-12">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="relative isolate overflow-hidden rounded-3xl bg-indigo-600 py-10 px-6 sm:py-16 sm:px-12 lg:flex lg:items-center lg:p-20 shadow-2xl">
                    {/* Decorative radial gradient */}
                    <svg
                        viewBox="0 0 1024 1024"
                        className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
                        aria-hidden="true"
                    >
                        <circle cx={512} cy={512} r={512} fill="url(#feedback-gradient)" fillOpacity="0.25" />
                        <defs>
                            <radialGradient id="feedback-gradient">
                                <stop stopColor="white" />
                                <stop offset={1} stopColor="white" />
                            </radialGradient>
                        </defs>
                    </svg>

                    <div className="lg:w-0 lg:flex-1">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Have suggestions?</h2>
                        <p className="mt-4 max-w-3xl text-lg text-indigo-100 leading-relaxed">
                            We are constantly improving ReCircle. Provide feedback and improvement suggestions directly to our developer team.
                        </p>
                    </div>
                    <div className="mt-12 sm:w-full sm:max-w-md lg:mt-0 lg:ml-8 lg:flex-1">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center group hover:bg-white/20 transition-all cursor-default shadow-lg">
                            <p className="text-indigo-100 mb-2 font-medium tracking-wide uppercase text-xs">Direct Support</p>
                            <a 
                                href={`mailto:${siteConfig.supportEmail}`} 
                                className="text-xl sm:text-2xl font-black text-white hover:text-indigo-200 transition-colors break-all underline decoration-2 underline-offset-8 decoration-white/30"
                            >
                                {siteConfig.supportEmail}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
       </div>

      {/* FOOTER - Minimal & Clean */}
      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors">
          <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col items-center justify-center gap-4 lg:px-8">
             <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-gray-400 dark:text-gray-500">
               <Link href="/about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About</Link>
               <Link href="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</Link>
               <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</Link>
               <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</Link>
               <Link href="/disclaimer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Disclaimer</Link>
             </div>
             <p className="text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
                 &copy; {new Date().getFullYear()} ReCircle. Built with ❤️ for Students.
             </p>
          </div>
      </footer>

      {earningModalOpen && (
        <StartEarningModal onClose={() => setEarningModalOpen(false)} />
      )}
    </div>
  );
}
