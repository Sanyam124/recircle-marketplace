import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how ReCircle collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 sm:px-10 py-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Privacy Policy</h1>
          <p className="text-indigo-200 text-sm mt-2 font-medium">Last updated: April 1, 2026</p>
        </div>

        <div className="px-6 sm:px-10 py-8 prose prose-gray dark:prose-invert prose-sm max-w-none space-y-6">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            At <strong>ReCircle</strong>, we are committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit and use our platform.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">1. Information We Collect</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">We collect the following types of information:</p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li><strong>Personal Information:</strong> Name, email address, profile picture, and university affiliation provided during registration.</li>
            <li><strong>Usage Data:</strong> Pages viewed, features used, search queries, and interaction patterns to improve our services.</li>
            <li><strong>Device Information:</strong> Browser type, IP address, operating system, and device identifiers for security and analytics.</li>
            <li><strong>Transaction Data:</strong> Details related to product/service listings, offers, orders, and communications between users.</li>
            <li><strong>Cookies:</strong> We use cookies and similar technologies for authentication, preferences, and analytics purposes.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>To create, maintain, and secure your account.</li>
            <li>To facilitate transactions and communications between buyers and sellers.</li>
            <li>To personalize your experience and provide relevant content.</li>
            <li>To send verification codes, order updates, and important notifications.</li>
            <li>To detect, prevent, and address fraud, abuse, and security issues.</li>
            <li>To improve our platform through analytics and user feedback.</li>
            <li>To display advertisements through third-party ad networks such as Google AdSense.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">3. Information Sharing</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">We do not sell your personal information. We may share information in the following cases:</p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li><strong>With Other Users:</strong> Your public profile, listings, and reviews are visible to other users.</li>
            <li><strong>Service Providers:</strong> We use third-party services for hosting, email delivery, payment processing, and analytics.</li>
            <li><strong>Advertising Partners:</strong> Third-party ad networks may collect data for targeted advertising in compliance with their policies.</li>
            <li><strong>Legal Requirements:</strong> We may disclose data if required by law or to protect our rights and safety.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">4. Cookies &amp; Tracking Technologies</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We use cookies to maintain your session, remember preferences, and gather analytics. Third-party advertisers may also set cookies for ad personalization. You can manage cookie preferences through your browser settings.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">5. Data Security</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We implement industry-standard security measures including encrypted passwords (bcrypt), HTTPS, secure cookie flags, and regular security audits. However, no method of electronic transmission is 100% secure.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">6. Your Rights</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>Access, update, or delete your personal data through your account settings.</li>
            <li>Opt out of promotional emails by using the unsubscribe link.</li>
            <li>Request a copy of your data by contacting us.</li>
            <li>Delete your account at any time, which will remove your personal data from our systems.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">7. Third-Party Links</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Our platform may contain links to third-party websites. We are not responsible for the privacy practices of external sites.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">8. Children's Privacy</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ReCircle is intended for users aged 16 and above. We do not knowingly collect data from children under 16.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">9. Changes to This Policy</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised "last updated" date.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">10. Contact Us</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{siteConfig.supportEmail}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
