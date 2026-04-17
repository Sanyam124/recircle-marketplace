import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how ReCircle collects, uses, and protects your personal information across all platform features.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 sm:px-10 py-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Privacy Policy</h1>
          <p className="text-indigo-200 text-sm mt-2 font-medium">Last updated: April 9, 2026</p>
        </div>

        <div className="px-6 sm:px-10 py-8 prose prose-gray dark:prose-invert prose-sm max-w-none space-y-6">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            At <strong>ReCircle</strong>, we are committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit and use our platform.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">1. Information We Collect</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">We collect the following types of information:</p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li><strong>Account Information:</strong> Name, email address, username, profile picture, bio, gender, and address provided during registration or profile editing.</li>
            <li><strong>Authentication Data:</strong> Credentials for email-based login, Google OAuth tokens, and OTP codes for phone and email verification.</li>
            <li><strong>Phone Number:</strong> Optionally provided for enhanced verification (Level 2). Visibility is controlled by your privacy settings.</li>
            <li><strong>Community Affiliation:</strong> University or college name and associated hostel/building when you join a verified campus Circle.</li>
            <li><strong>Listing Data:</strong> Product and service listings you create, including titles, descriptions, images, prices, categories, conditions, availability, and location data (state, city, hostel, and geographic coordinates).</li>
            <li><strong>Transaction Data:</strong> Offers, orders, deal records, reviews, and dispute information related to your transactions.</li>
            <li><strong>Communication Data:</strong> Messages sent through the in-app chat system, including timestamps and read status.</li>
            <li><strong>Board Posts:</strong> Content you post on the Circle Board, including text, images, tags, and community associations.</li>
            <li><strong>Preferences &amp; Settings:</strong> Theme preferences (light/dark/system), grid density, default landing community, default hostel, notification settings, vacation mode status, and privacy toggles.</li>
            <li><strong>Usage Data:</strong> Pages viewed, features used, search queries, and interaction patterns to improve our services.</li>
            <li><strong>Device Information:</strong> Browser type, IP address, operating system, and device identifiers for security and analytics.</li>
            <li><strong>Location Data:</strong> Browser geolocation (with your permission) for proximity-based search and map features.</li>
            <li><strong>Push Notification Subscription:</strong> Browser push subscription data if you opt in to receive real-time notifications.</li>
            <li><strong>Cookies:</strong> We use cookies and similar technologies for authentication (JWT tokens), preferences, and analytics purposes.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>To create, maintain, and secure your account.</li>
            <li>To verify your identity and campus community membership through email, OTP, and community verifier processes.</li>
            <li>To facilitate transactions, offers, and communications between buyers, sellers, and service providers.</li>
            <li>To display your public profile, listings, and reviews to other users.</li>
            <li>To power search, explore, and filtering features including location-based and community-based filtering.</li>
            <li>To personalize your experience through preferences like default landing community, hostel filters, theme, and grid layout.</li>
            <li>To send push notifications for new messages, offers, order updates, and important platform alerts.</li>
            <li>To detect, prevent, and address fraud, abuse, spam (via rate limiting), and security issues.</li>
            <li>To enforce platform rules through the reporting, moderation, and dispute resolution systems.</li>
            <li>To maintain user safety features including blocking, vacation mode, and ban enforcement.</li>
            <li>To improve our platform through analytics and user feedback.</li>
            <li>To display advertisements through third-party ad networks such as Google AdSense.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">3. Information Sharing</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">We do not sell your personal information. We may share information in the following cases:</p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li><strong>With Other Users:</strong> Your public profile (name, username, profile picture, bio, reviews, and ratings) and your listings are visible to other users. Your email is only visible if you enable it in Privacy settings. Your phone number is visible only to verified community members if you enable that setting.</li>
            <li><strong>With Community Verifiers:</strong> When you submit a community verification request, designated verifiers can view your request details to approve or reject your membership.</li>
            <li><strong>With Administrators:</strong> Platform administrators have access to user data, reports, disputes, and moderation tools to ensure platform safety and compliance.</li>
            <li><strong>Service Providers:</strong> We use third-party services for cloud hosting, image storage (Cloudinary), email delivery, and analytics.</li>
            <li><strong>Advertising Partners:</strong> Third-party ad networks may collect data for targeted advertising in compliance with their policies.</li>
            <li><strong>Legal Requirements:</strong> We may disclose data if required by law or to protect our rights and safety.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">4. Your Privacy Controls</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">ReCircle gives you granular control over your privacy through the Settings page:</p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li><strong>Email Visibility:</strong> Toggle whether your email address is displayed on your public profile.</li>
            <li><strong>Phone Visibility:</strong> Toggle whether your phone number is visible to verified community members.</li>
            <li><strong>Online Status:</strong> Hide or show your real-time online presence indicator.</li>
            <li><strong>Vacation Mode:</strong> Temporarily hide all your listings from the marketplace without deleting them.</li>
            <li><strong>Notification Preferences:</strong> Control whether you receive marketing/deal alerts and chat message notifications.</li>
            <li><strong>User Blocking:</strong> Block specific users from seeing your listings or contacting you. This is a two-way block.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">5. Cookies &amp; Tracking Technologies</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We use cookies to maintain your authentication session (via secure HTTP-only JWT tokens), remember your preferences (theme, grid layout), and gather analytics. Third-party advertisers may also set cookies for ad personalization. You can manage cookie preferences through your browser settings.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">6. Data Security</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We implement industry-standard security measures including encrypted passwords (bcrypt hashing), HTTPS encryption, secure HTTP-only cookie flags, server-side token verification, rate limiting to prevent abuse, and regular security audits. Images are stored securely on Cloudinary&apos;s infrastructure. However, no method of electronic transmission is 100% secure.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">7. Data Retention &amp; Deletion</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>Your data is retained for as long as your account is active.</li>
            <li>You may update or modify your personal data at any time through your profile settings.</li>
            <li>You may delete your account at any time through the Settings page. Deletion permanently removes your profile, listings, reviews, board posts, messages, orders, and notifications.</li>
            <li>Associated images stored on our cloud provider are also garbage-collected upon account deletion.</li>
            <li>If there are pending moderation reports against your account at the time of deletion, your account may be shadow-archived (deactivated with data redacted) until the review is complete, after which it is fully purged.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">8. Your Rights</h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
            <li>Access, update, or delete your personal data through your account settings.</li>
            <li>Control the visibility of your email, phone, and online status.</li>
            <li>Opt out of push notifications through your browser settings.</li>
            <li>Request a copy of your data by contacting us.</li>
            <li>Delete your account at any time, which will remove your personal data from our systems.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">9. Third-Party Links</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Our platform may contain links to third-party websites and services. We are not responsible for the privacy practices of external sites.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">10. Children&apos;s Privacy</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ReCircle is intended for users aged 16 and above. We do not knowingly collect data from children under 16.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">11. Changes to This Policy</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised &quot;last updated&quot; date.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">12. Contact Us</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{siteConfig.supportEmail}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
