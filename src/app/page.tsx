'use client';

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StartEarningModal from "@/components/StartEarningModal";
import { getIcon } from "@/components/Icons";

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
      <div className="bg-white dark:bg-gray-900 transition-colors duration-300 min-h-screen">
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
        
        <div className="py-24 sm:py-32 lg:pb-40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl transition-colors">
                The Student's Marketplace.
                <span className="block text-indigo-600 dark:text-indigo-400 mt-2 hover:text-indigo-500 transition-colors">Buy. Sell. Freelance.</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 transition-colors">
                ReCircle is the open community platform for students to securely trade essentials and offer freelance services. 
                Say goodbye to platform fees and hello to direct student connections.
              </p>
              
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/explore"
                  className="rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all hover:scale-105"
                >
                  Start Exploring
                </Link>
                <button
                  onClick={handleStartEarning}
                  className="text-sm font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Start Earning <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
            
            {/* Trust Banner - Qualitative */}
            <div className="mt-16 sm:mt-24 border-y border-gray-100 dark:border-gray-800 py-8 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl transition-colors">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-12 text-center lg:grid-cols-3">
                <div className="mx-auto flex max-w-sm flex-col gap-y-2 px-6">
                  <dt className="text-base leading-7 text-gray-500 dark:text-gray-400">Keep 100% of your earnings. No hidden charges or listing fees for buyers, sellers, or freelancers.</dt>
                  <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-2">Zero Platform Fees</dd>
                </div>
                <div className="mx-auto flex max-w-sm flex-col gap-y-2 px-6 lg:border-x lg:border-gray-200 dark:lg:border-gray-800">
                  <dt className="text-base leading-7 text-gray-500 dark:text-gray-400">Negotiate, meet up on campus, and exchange goods or services directly without middlemen.</dt>
                  <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-2">Direct Peer-to-Peer</dd>
                </div>
                <div className="mx-auto flex max-w-sm flex-col gap-y-2 px-6">
                  <dt className="text-base leading-7 text-gray-500 dark:text-gray-400">Built exclusively for students to easily exchange textbooks, sell essentials, and offer freelance skills locally.</dt>
                  <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-2">Campus Focused</dd>
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

      {/* FEATURES / VALUE PROP */}
      <div className="bg-white dark:bg-gray-900 transition-colors py-16 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
                <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Why ReCircle?</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">Built for Campus Life</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Student-Driven Network</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Join a bustling community of peers exchanging textbooks, electronics, and services right on your campus. Fast, local, and reliable.</p>
                </div>

                {/* Feature 2 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.375.665v.75c0 .621.504 1.125 1.125 1.125H21" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Zero Commission</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Keep 100% of your earnings. ReCircle connects you directly with buyers and clients on campus with absolutely zero hidden fees or platform cuts.</p>
                </div>

                {/* Feature 3 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.375.665v.75c0 .621.504 1.125 1.125 1.125H21" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Smart Offers</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Negotiate the best deals efficiently. Send specific price offers for products or custom rate requests for services, and close deals directly from your profile.</p>
                </div>
                
                {/* Feature 4 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Real-Time Chat</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Coordinate easily with instant messaging. Keep track of conversations with read receipts ("Seen" ticks), online status indicators, and smooth chat history.</p>
                </div>

                {/* Feature 5 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Safe & Moderated</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">A community moderated by peers. Integrated reporting ensures rapid admin response to fraudulent listings or abusive behavior, keeping ReCircle secure.</p>
                </div>
                
                {/* Feature 6 */}
                <div className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="h-12 w-12 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Rich Listings & Sharing</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">View multiple images clearly with built-in swipeable carousels. Share your entire profile, a specific product, or a service with friends instantly.</p>
                </div>
            </div>
        </div>
      </div>

       {/* HOW IT WORKS */}
       <div className="bg-white dark:bg-gray-900 transition-colors py-16 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">How to trade & hire on ReCircle</h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Turn your unused items into cash or offer your skills in just three steps.</p>
                </div>
                
                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-indigo-100 dark:bg-indigo-900/50 -z-10" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <div className="relative bg-white dark:bg-gray-900 transition-colors pt-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-lg mb-6 ring-8 ring-white dark:ring-gray-900">1</div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Post or Discover</h3>
                            <p className="text-gray-600 dark:text-gray-400 px-4">Snap photos to list your items or define your freelance service instantly. Or, explore what other students are offering nearby.</p>
                        </div>
                        <div className="relative bg-white dark:bg-gray-900 transition-colors pt-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-lg mb-6 ring-8 ring-white dark:ring-gray-900">2</div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Chat & Negotiate</h3>
                            <p className="text-gray-600 dark:text-gray-400 px-4">Use our real-time messenger to ask questions, discuss gig details, send offers, and agree on a fair rate directly.</p>
                        </div>
                        <div className="relative bg-white dark:bg-gray-900 transition-colors pt-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-lg mb-6 ring-8 ring-white dark:ring-gray-900">3</div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Meet & Complete</h3>
                            <p className="text-gray-600 dark:text-gray-400 px-4">Arrange a safe meetup spot on campus to inspect the item or finalize the service, and complete your secure exchange.</p>
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
                                href="mailto:sanyam.sharma.work@gmail.com" 
                                className="text-xl sm:text-2xl font-black text-white hover:text-indigo-200 transition-colors break-all underline decoration-2 underline-offset-8 decoration-white/30"
                            >
                                sanyam.sharma.work@gmail.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>
       </div>

      {/* FOOTER - Minimal & Clean */}
      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors">
          <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col items-center justify-center lg:px-8">
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


