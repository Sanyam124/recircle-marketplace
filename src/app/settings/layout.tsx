import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings, preferences, and security options.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
