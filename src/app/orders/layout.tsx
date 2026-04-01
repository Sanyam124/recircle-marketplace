import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Orders',
  description: 'Track your purchases, bookings, sales, and service orders — all in one place.',
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
