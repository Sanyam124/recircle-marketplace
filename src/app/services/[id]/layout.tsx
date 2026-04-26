import type { Metadata } from 'next';
import dbConnect from '@/lib/db';
import Service from '@/models/Service';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    await dbConnect();
    const service = await Service.findById(id).lean();

    if (!service) {
      return {
        title: 'Service Not Found',
        description: 'The requested service could not be found on ReCircle Marketplace.',
      };
    }

    const title = `${(service as any).title} | ReCircle Services`;
    const description = (service as any).description?.substring(0, 160) || 'Find the best campus services on ReCircle.';
    const price = (service as any).price;
    const category = (service as any).category;

    return {
      title,
      description: `${description} - Starting from ₹${price} | Category: ${category}`,
      openGraph: {
        title,
        description: (service as any).description,
        images: (service as any).images?.[0] ? [{ url: (service as any).images[0] }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: (service as any).images?.[0] ? [(service as any).images[0]] : [],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Service Details',
      description: 'Explore community services on ReCircle Marketplace.',
    };
  }
}

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
