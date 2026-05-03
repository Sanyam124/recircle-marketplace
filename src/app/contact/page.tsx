import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the ReCircle team. We are here to help with account issues, feedback, disputes, and partnership inquiries.',
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 sm:px-10 py-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Contact Us</h1>
          <p className="text-indigo-200 text-sm mt-2 font-medium">We&apos;d love to hear from you.</p>
        </div>

        <div className="px-6 sm:px-10 py-8 space-y-8">
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Whether you have a question about the platform, need help with your account, want to report an issue, have a dispute, or have a partnership proposal — we&apos;re here to help.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Email */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Email Support</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">For general inquiries and account help</p>
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline break-all">
                {siteConfig.supportEmail}
              </a>
            </div>

            {/* Response Time */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Response Time</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">We aim to respond within</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">24–48 hours</p>
            </div>
          </div>

          {/* Self-Service Options */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Before contacting us, try these self-service options</h3>
            <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Account Management:</strong> Visit your <Link href="/settings?tab=circles" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Settings</Link> page to update your profile, manage privacy, toggle Vacation Mode, or manage your communities.</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Report Content:</strong> Use the in-app Report button on any listing, user profile, or board post to flag inappropriate content for admin review.</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Transaction Disputes:</strong> Raise a Dispute through the <Link href="/orders" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Orders</Link> page for issues with any purchase, sale, or service order.</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Block a User:</strong> If someone is harassing you, use the Block feature on their profile to prevent all future interaction.</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Community Verification:</strong> To join a campus Circle, go to <Link href="/settings?tab=circles" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Settings → Communities</Link> and submit a verification request to your campus verifier.</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">•</span><span><strong>Account Deletion:</strong> You can permanently delete your account and all associated data from <Link href="/settings" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Settings → Account System</Link>.</span></li>
            </ul>
          </div>

          {/* What to include */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">When contacting us, please include</h3>
            <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-gray-400 font-bold mt-0.5">•</span><span>Your registered email address or username</span></li>
              <li className="flex items-start gap-2"><span className="text-gray-400 font-bold mt-0.5">•</span><span>A clear description of the issue or question</span></li>
              <li className="flex items-start gap-2"><span className="text-gray-400 font-bold mt-0.5">•</span><span>Screenshots if applicable (e.g., error messages, incorrect listings)</span></li>
              <li className="flex items-start gap-2"><span className="text-gray-400 font-bold mt-0.5">•</span><span>Order ID or listing URL if related to a specific transaction</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
