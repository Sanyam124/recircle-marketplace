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

        // --- 1. REFERER SHIELD ---
        // Stop casual Postman/cURL script kiddies who don't fake headers
        const referer = req.headers.get('referer') || '';
        if (!referer.includes('/products/create') && 
            !referer.includes('/services/create') && 
            !referer.includes('/profile') &&
            !referer.includes('/settings') &&
            !referer.includes('/admin')) {
             return NextResponse.json({ error: 'Unauthorized upload source. Uploading must be done through official UI forms.' }, { status: 403 });
        }

        // --- 2. CLOUDINARY QUOTA SHIELD (Rate Limit) ---
        // Max 30 image uploads per hour per user (enough for ~6 maxed-out product listings)
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rl = await checkRateLimit(decoded.userId, 'image-upload', 30, 60 * 60 * 1000);
        
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'Upload limit reached. You can upload a maximum of 30 images per hour to prevent spam.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 3600
                },
                { status: 429 }
            );
        }

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
