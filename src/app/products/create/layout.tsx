import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell a Product',
  description: 'List your product for sale on the campus marketplace. Reach students in your community instantly.',
};

export default function CreateProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
