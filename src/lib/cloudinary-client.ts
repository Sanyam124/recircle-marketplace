/**
 * Client-safe Cloudinary utility functions.
 * Does NOT import the 'cloudinary' Node.js SDK.
 */

/**
 * Optimizes a Cloudinary URL by adding transformations for format (f_auto) and quality (q_auto).
 * Safe to use in both Server and Client Components.
 */
export function optimizeCloudinaryUrl(
    url: string | undefined, 
    options: { width?: number; height?: number; crop?: string } = {}
): string {
    if (!url || !url.includes('cloudinary.com')) return url || '';
  
    const { width, height, crop = 'fill' } = options;
    const parts = url.split('/upload/');
    if (parts.length < 2) return url;
  
    // Combine transformations
    let transformations = 'f_auto,q_auto';
    if (width) transformations += `,w_${width}`;
    if (height) transformations += `,h_${height}`;
    if (width || height) transformations += `,c_${crop}`;
  
    // We join all indices starting from 1 to handle cases where '/upload/' might appear multiple times (though rare)
    const afterUpload = parts.slice(1).join('/upload/');
    return `${parts[0]}/upload/${transformations}/${afterUpload}`;
}
