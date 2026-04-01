import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the terms and conditions for using the ReCircle campus marketplace platform.',
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 sm:px-10 py-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Terms of Service</h1>
          <p className="text-indigo-200 text-sm mt-2 font-medium">Last updated: April 1, 2026</p>
        </div>

        <div className="px-6 sm:px-10 py-8 prose prose-gray dark:prose-invert prose-sm max-w-none space-y-6">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Welcome to <strong>ReCircle</strong>. By accessing or using our platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">1. Account Registration</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>You must provide accurate and complete information during registration.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must be at least 16 years old to create an account.</li>
            <li>One person may not maintain more than one account.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">2. Acceptable Use</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">You agree not to:</p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>Post false, misleading, or fraudulent listings.</li>
            <li>Sell prohibited, illegal, or unsafe items.</li>
            <li>Harass, threaten, or abuse other users.</li>
            <li>Attempt to manipulate the platform, including fake reviews or ratings.</li>
            <li>Scrape, crawl, or use automated tools to access the platform without permission.</li>
            <li>Circumvent any security features or restrictions.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">3. Listings &amp; Transactions</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>Sellers are responsible for the accuracy of their listings, including descriptions, prices, and images.</li>
            <li>ReCircle acts as a platform to connect buyers and sellers; we are not a party to any transaction.</li>
            <li>All transactions are between the buyer and seller. We do not guarantee the quality, safety, or legality of items.</li>
            <li>Users are responsible for resolving disputes directly, though we provide a dispute resolution system as a courtesy.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">4. Intellectual Property</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            All content on ReCircle, including the design, logo, code, and text, is the intellectual property of ReCircle. User-generated content (listings, reviews, messages) remains the property of the respective user, but by posting it you grant us a non-exclusive license to display it on the platform.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">5. Account Suspension &amp; Termination</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>We reserve the right to suspend or ban accounts that violate these terms.</li>
            <li>Banned users will receive notification with the reason and duration of the ban.</li>
            <li>We may delete accounts and all associated data at our discretion for repeated violations.</li>
            <li>You may delete your account at any time through the Settings page.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">6. Limitation of Liability</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ReCircle is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of the platform, including but not limited to lost profits, data loss, or injuries resulting from transactions.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">7. Advertisements</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ReCircle may display third-party advertisements, including those served by Google AdSense. These ads may use cookies and similar technologies to serve personalized content. By using the platform, you acknowledge the presence of advertisements.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">8. Modifications</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the revised terms.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">9. Governing Law</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            These terms are governed by the laws of India. Any disputes shall be resolved in the courts of the appropriate jurisdiction.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">10. Contact</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            For any questions regarding these terms, contact us at{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{siteConfig.supportEmail}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
