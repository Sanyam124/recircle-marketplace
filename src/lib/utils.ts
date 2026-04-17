/**
 * Formats a date or date string into a relative "time ago" string.
 * e.g., "Just now", "5m ago", "2 days ago", "3 months ago", "1 year ago"
 */
export function formatTimeAgo(date: Date | string | undefined): string {
    if (!date) return '';

    const past = new Date(date);
    if (isNaN(past.getTime())) return '';

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * Formats a date for chat sidebar according to requirements:
 * - Today: Time (e.g., "10:30 AM")
 * - Yesterday: "Yesterday"
 * - Older: Date (e.g., "19 Feb 2026")
 */
export function formatChatMessageDate(date: Date | string | undefined): string {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();

    // Normalize dates to midnight to compare days correctly
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (messageDate.getTime() === today.getTime()) {
        // Today: Return time
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (messageDate.getTime() === yesterday.getTime()) {
        // Yesterday
        return 'Yesterday';
    } else {
        // Older: "19 Feb 2026"
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
}

/**
 * Strips MongoDB operators (keys starting with $) from an object recursively
 * to prevent NoSQL injection.
 */
export function sanitize(input: any): any {
    if (input instanceof Array) {
        for (let i = 0; i < input.length; i++) {
            input[i] = sanitize(input[i]);
        }
    } else if (input !== null && typeof input === 'object') {
        Object.keys(input).forEach(key => {
            if (key.startsWith('$')) {
                delete input[key];
            } else {
                input[key] = sanitize(input[key]);
            }
        });
    }
    return input;
}

/**
 * Ensures an input is a clean, trimmed string. 
 * Returns an empty string if the input is not a string (preventing object-based injection).
 */
export function safeString(input: any): string {
    if (typeof input !== 'string') return '';
    return input.trim();
}

/**
 * Calculates the distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance; // Returns distance in km
}

/**
 * Formats a distance in kilometers into a human-readable string.
 */
export function formatDistance(distanceInKm: number): string {
    if (distanceInKm < 1) {
        return `${Math.round(distanceInKm * 1000)} m`;
    }
    return `${distanceInKm.toFixed(1)} km`;
}
