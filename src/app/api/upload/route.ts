import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import connectToDatabase from '@/lib/db';

/**
 * Unified Upload Handler
 * Supports uploading images to Cloudinary with authentication.
 */
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

        const { image, folder = 'recircle/general' } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
        }

        if (!image.startsWith('data:image')) {
            return NextResponse.json({ error: 'Invalid image format. Must be base64 data URI.' }, { status: 400 });
        }

        await connectToDatabase();

        // Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(image, folder);

        return NextResponse.json({ 
            success: true, 
            url: imageUrl 
        }, { status: 200 });

    } catch (error: any) {
        console.error('Upload API Error:', error);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }
}
