import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SWRProvider } from "@/components/SWRProvider";
import PushNotificationManager from "@/components/PushNotificationManager";
import CelebrationContainer from "@/components/CelebrationContainer";
import MaintenanceGuard from "@/components/MaintenanceGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ReCircle - The Student's Marketplace",
    template: "%s | ReCircle",
  },
  description: "The open community platform for students to securely trade essentials, buy and sell, and offer freelance services on campus.",
  keywords: ["student marketplace", "campus", "recycle", "freelance", "college", "ReCircle", "second hand", "services"],
  authors: [{ name: "ReCircle Team" }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ReCircle',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/logo_main.png',
    apple: '/icon-192x192.png',
  },
  openGraph: {
    title: "ReCircle - The Student's Marketplace",
    description: "Securely trade essentials and offer freelance services on campus.",
    type: "website",
    siteName: "ReCircle",
  },
};

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {adsenseId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SWRProvider>
            <AuthProvider>
              <PushNotificationManager />
              <CelebrationContainer />
              <MaintenanceGuard>
                <div className="flex flex-col bg-[#f5f6f9] dark:bg-gray-900 transition-colors duration-500">
                  <Navbar />
                  <main className="pt-16 pb-24 md:pb-0">
                    {children}
                  </main>
                  <Footer />
                  <MobileBottomNav />
                </div>
              </MaintenanceGuard>
            </AuthProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

