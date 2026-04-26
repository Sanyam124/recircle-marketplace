import type { Metadata } from 'next';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    await dbConnect();
    const product = await Product.findById(id).lean();

    if (!product) {
      return {
        title: 'Product Not Found',
        description: 'The requested product could not be found on ReCircle Marketplace.',
      };
    }

    const title = `${(product as any).title} | ReCircle`;
    const description = (product as any).description?.substring(0, 160) || 'View this item on ReCircle Marketplace.';
    const price = (product as any).price;
    const category = (product as any).category;

    return {
      title,
      description: `${description} - Price: ₹${price} | Category: ${category}`,
      openGraph: {
        title,
        description: (product as any).description,
        images: (product as any).images?.[0] ? [{ url: (product as any).images[0] }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: (product as any).images?.[0] ? [(product as any).images[0]] : [],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Product Details',
      description: 'View product details on ReCircle Marketplace.',
    };
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
