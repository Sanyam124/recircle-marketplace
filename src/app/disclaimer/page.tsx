import type { Metadata } from 'next';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'Important disclaimers about the use of ReCircle marketplace platform and third-party content.',
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 px-6 sm:px-10 py-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Disclaimer</h1>
          <p className="text-gray-300 text-sm mt-2 font-medium">Last updated: April 1, 2026</p>
        </div>

        <div className="px-6 sm:px-10 py-8 prose prose-gray dark:prose-invert prose-sm max-w-none space-y-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-4">General Disclaimer</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The information provided on ReCircle is for general informational purposes only. All user-generated content, including product/service listings, descriptions, images, and prices, is provided by individual users and has not been independently verified by ReCircle.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">No Warranties</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ReCircle makes no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the platform or the information, products, services, or related graphics contained on the platform.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">Transaction Disclaimer</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ReCircle serves as a platform to connect buyers and sellers. We are not a party to any transaction between users. We do not guarantee the quality, safety, legality, or authenticity of any listed item or service. Users transact at their own risk.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">External Links &amp; Advertisements</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            This platform may contain links to external websites and third-party advertisements (including Google AdSense). These links and ads are provided for convenience and informational purposes. ReCircle does not endorse and is not responsible for the content, accuracy, or practices of any third-party website or advertisement.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">Limitation of Liability</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            In no event shall ReCircle be liable for any loss or damage, including without limitation, indirect or consequential loss or damage, arising from the use of this platform.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white !mt-8">Contact</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            If you have concerns about any content on this platform, please contact us at{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{siteConfig.supportEmail}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
