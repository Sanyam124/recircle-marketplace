import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Marketplace',
  description: 'Browse products and services from your campus community. Find great deals on electronics, books, furniture, and freelance services.',
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
