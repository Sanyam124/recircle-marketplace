'use client';

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

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

  return (
    <div className="bg-white dark:bg-gray-900 transition-colors duration-300">
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
                <Link
                  href="/products/create"
                  className="text-sm font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Start Earning <span aria-hidden="true">→</span>
                </Link>
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
      <div className="bg-gray-900 py-16 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
                <h2 className="text-base font-semibold leading-7 text-indigo-400">Why ReCircle?</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Built for Campus Life</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-indigo-500/50 transition-colors">
                    <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Student-Driven Network</h3>
                    <p className="text-gray-400">Join a bustling community of peers exchanging textbooks, electronics, and services right on your campus. Fast, local, and reliable.</p>
                </div>

                {/* Feature 2 */}
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-indigo-500/50 transition-colors">
                    <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.375.665v.75c0 .621.504 1.125 1.125 1.125H21" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Zero Commission</h3>
                    <p className="text-gray-400">Keep 100% of your earnings. ReCircle connects you directly with buyers and clients on campus with absolutely zero hidden fees or platform cuts.</p>
                </div>

                {/* Feature 3 */}
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-indigo-500/50 transition-colors">
                    <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.375.665v.75c0 .621.504 1.125 1.125 1.125H21" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Smart Offers</h3>
                    <p className="text-gray-400">Negotiate the best deals efficiently. Send specific price offers for products or custom rate requests for services, and close deals directly from your profile.</p>
                </div>
                
                {/* Feature 4 */}
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-indigo-500/50 transition-colors">
                    <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Real-Time Chat</h3>
                    <p className="text-gray-400">Coordinate easily with instant messaging. Keep track of conversations with read receipts ("Seen" ticks), online status indicators, and smooth chat history.</p>
                </div>

                {/* Feature 5 */}
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-indigo-500/50 transition-colors">
                    <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Safe & Moderated</h3>
                    <p className="text-gray-400">A community moderated by peers. Integrated reporting ensures rapid admin response to fraudulent listings or abusive behavior, keeping ReCircle secure.</p>
                </div>
                
                {/* Feature 6 */}
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-indigo-500/50 transition-colors">
                    <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Rich Listings & Sharing</h3>
                    <p className="text-gray-400">View multiple images clearly with built-in swipeable carousels. Share your entire profile, a specific product, or a service with friends instantly.</p>
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
                <div className="rounded-2xl bg-indigo-600 py-10 px-6 sm:py-16 sm:px-12 lg:flex lg:items-center lg:p-20 shadow-xl">
                    <div className="lg:w-0 lg:flex-1">
                        <h2 className="text-3xl font-bold tracking-tight text-white">Have suggestions?</h2>
                        <p className="mt-4 max-w-3xl text-lg text-indigo-100">
                            We are constantly improving ReCircle. Provide feedback and improvement suggestions directly to our developer.
                        </p>
                    </div>
                    <div className="mt-12 sm:w-full sm:max-w-md lg:mt-0 lg:ml-8 lg:flex-1">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
                            <p className="text-indigo-100 mb-2">Email us at:</p>
                            <a 
                                href="mailto:sanyam.sharma.work@gmail.com" 
                                className="text-xl font-bold text-white hover:text-indigo-200 transition-colors break-all"
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
    </div>
  );
}

// Helper for Icons (Replacing huge SVG blocks in main flow)
function getIcon(name: string) {
    const iconClass = "w-8 h-8";
    switch(name) {
        case 'book-open':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
        case 'document-text':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
        case 'computer-desktop':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>;
        case 'home':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
        case 'shopping-bag':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
        case 'wrench-screwdriver':
             return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
        case 'academic-cap':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>;
        case 'paint-brush':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>;
        case 'camera':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>;
        case 'sparkles':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.415-2.415L14.25 6l1.076-.259a3.375 3.375 0 002.415-2.415L18 2.25l.259 1.076a3.375 3.375 0 002.415 2.415L21.75 6l-1.076.259a3.375 3.375 0 00-2.415 2.415zM3.138 19.138l-.169.676-.169-.676a2.25 2.25 0 00-1.611-1.611l-.676-.169.676-.169a2.25 2.25 0 001.611 1.611l.169-.676.169.676a2.25 2.25 0 001.611 1.611l.676.169-.676.169a2.25 2.25 0 00-1.611 1.611z" /></svg>;
        case 'queue-list':
            return <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>;
        default:
            return null;
    }
}
