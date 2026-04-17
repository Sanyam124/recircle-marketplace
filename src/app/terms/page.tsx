import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the terms and conditions for using the ReCircle campus marketplace platform, including rules for listings, communities, and transactions.',
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 sm:px-10 py-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Terms of Service</h1>
          <p className="text-indigo-200 text-sm mt-2 font-medium">Last updated: April 9, 2026</p>
        </div>

        <div className="px-6 sm:px-10 py-8 prose prose-gray dark:prose-invert prose-sm max-w-none space-y-6">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Welcome to <strong>ReCircle</strong>. By accessing or using our platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">1. Account Registration &amp; Authentication</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>You must provide accurate and complete information during registration.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must be at least 16 years old to create an account.</li>
            <li>One person may not maintain more than one account.</li>
            <li>You may register using your email address or via Google OAuth. Both methods are subject to these terms.</li>
            <li>Username changes are limited to a maximum of 3 times per account lifetime.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">2. Campus Communities (Circles)</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>ReCircle supports verified campus communities (&quot;Circles&quot;) tied to specific colleges or universities.</li>
            <li>To join a Circle, you must submit a verification request which is reviewed by a designated community verifier.</li>
            <li>Community-only listings are visible exclusively to verified members of that community.</li>
            <li>Misrepresenting your university affiliation or attempting to join a community fraudulently may result in permanent account suspension.</li>
            <li>Community verifiers are appointed by ReCircle administrators and have the authority to approve or reject verification requests.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">3. Acceptable Use</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">You agree not to:</p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>Post false, misleading, or fraudulent listings for products or services.</li>
            <li>Sell or offer prohibited, illegal, or unsafe items or services.</li>
            <li>Harass, threaten, or abuse other users via chat, reviews, or the Circle Board.</li>
            <li>Post spam, irrelevant content, or unsolicited promotions on the Circle Board.</li>
            <li>Attempt to manipulate the platform, including fake reviews, ratings, or verification requests.</li>
            <li>Scrape, crawl, or use automated tools to access the platform without permission.</li>
            <li>Circumvent any security features, rate limits, or content restrictions.</li>
            <li>Create duplicate accounts to evade bans or restrictions.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">4. Listings &amp; Transactions</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>Sellers and service providers are responsible for the accuracy of their listings, including descriptions, prices, images, and availability.</li>
            <li>Products may be listed for sale, rent, or both. Rental terms including price per unit (day/week/month) must be clearly stated.</li>
            <li>Services must accurately describe scope, pricing model (hourly/per-project/per-session), and availability.</li>
            <li>ReCircle acts as a platform to connect buyers and sellers; we are not a party to any transaction.</li>
            <li>All transactions are peer-to-peer between the buyer and seller. We do not guarantee the quality, safety, or legality of items or services.</li>
            <li>Users may send structured price offers for products. Both parties must agree before a transaction is finalized.</li>
            <li>Users may raise disputes through the order system for transaction issues. Disputes are reviewed by administrators as a courtesy service.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">5. Communication &amp; Chat</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>The built-in chat system is provided for transaction-related communication between users.</li>
            <li>Messages, including read receipts and online status, are stored to facilitate conversations.</li>
            <li>Abusive, threatening, or harassing messages may be reported and will result in account action.</li>
            <li>Users may block other users to prevent further communication. Blocked users cannot see your listings or contact you.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">6. Reviews &amp; Ratings</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>Users may leave reviews and ratings after completed transactions.</li>
            <li>Reviews must be honest, factual, and related to the actual transaction experience.</li>
            <li>Fake, retaliatory, or incentivized reviews are prohibited and may be removed.</li>
            <li>Average ratings and review counts are publicly visible on user profiles.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">7. Circle Board</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>The Circle Board is a campus-wide bulletin for announcements, events, roommate searches, lost &amp; found, and general community interaction.</li>
            <li>Posts must be relevant and respectful. Spam, hate speech, and illegal content will be removed.</li>
            <li>Board posts are subject to the same reporting and moderation rules as listings.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">8. Intellectual Property</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            All content on ReCircle, including the design, logo, code, and text, is the intellectual property of ReCircle. User-generated content (listings, reviews, board posts, messages) remains the property of the respective user, but by posting it you grant us a non-exclusive license to display it on the platform.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">9. Account Suspension &amp; Termination</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>We reserve the right to suspend or ban accounts that violate these terms.</li>
            <li>Bans may be temporary (with a set expiry date) or permanent, depending on the severity of the violation.</li>
            <li>Banned users will be automatically logged out and will not be able to access the platform until the ban expires or is lifted.</li>
            <li>We may delete accounts and all associated data at our discretion for repeated violations.</li>
            <li>You may delete your account at any time through the Settings page. Account deletion is permanent and removes all your listings, reviews, messages, orders, and personal data. If there are pending moderation reports against your account, your profile will be shadow-archived until the review is complete.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">10. Vacation Mode</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Users may enable Vacation Mode through Settings. When active, all your listings will be temporarily hidden from the marketplace. Your profile remains accessible but your items will not appear in search results or the Explore feed. Vacation Mode can be toggled on or off at any time.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">11. Limitation of Liability</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ReCircle is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from the use of the platform, including but not limited to lost profits, data loss, injuries, or losses resulting from transactions between users.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">12. Advertisements</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ReCircle may display third-party advertisements, including those served by Google AdSense. These ads may use cookies and similar technologies to serve personalized content. By using the platform, you acknowledge the presence of advertisements.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">13. Modifications</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the revised terms. We will update the &quot;last updated&quot; date at the top of this page when changes are made.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">14. Governing Law</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            These terms are governed by the laws of India. Any disputes shall be resolved in the courts of the appropriate jurisdiction.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">15. Contact</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            For any questions regarding these terms, contact us at{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{siteConfig.supportEmail}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
