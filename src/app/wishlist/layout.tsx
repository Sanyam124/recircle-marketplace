import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Your saved products and services. Keep track of items you love and get back to them anytime.',
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
