import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offer a Service',
  description: 'Offer your freelance services to the campus community. From tutoring to design, reach students who need your skills.',
};

export default function CreateServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
