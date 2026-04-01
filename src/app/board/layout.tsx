import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Board',
  description: 'Browse campus announcements, requests, and community discussions. Stay connected with your circle.',
};

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
