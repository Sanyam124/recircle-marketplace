import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export async function uploadToCloudinary(file: string, folder: string = 'recircle'): Promise<string> {
    // If no keys are set, return a placeholder or throw
    if (!process.env.CLOUDINARY_API_KEY || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
        console.warn('Cloudinary keys missing, throwing error to trigger base64 fallback.');
        throw new Error('Cloudinary keys missing');
    }

    try {
        const result = await cloudinary.uploader.upload(file, {
            folder,
            format: 'webp',
            quality: 'auto',
            fetch_format: 'auto'
        });
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}
