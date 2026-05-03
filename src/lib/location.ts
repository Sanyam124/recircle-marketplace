
/**
 * Shared location utilities for ReCircle Marketplace (India Only)
 */

export interface GeocodeResult {
    city: string;
    state: string;
    pincode: string;
    countryCode: string;
    display?: string;
}

/**
 * Reverse geocode coordinates to get address details via Nominatim
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<GeocodeResult> => {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const address = data.address || {};
        return {
            city: address.city || address.town || address.village || address.county || address.state_district || '',
            state: address.state || '',
            pincode: address.postcode || '',
            countryCode: address.country_code || '',
            display: data.display_name
        };
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return { city: '', state: '', pincode: '', countryCode: '' };
    }
};

/**
 * Geocode a city and state name to coordinates
 */
export const geocodeLocation = async (city: string, state: string): Promise<[number, number] | null> => {
    try {
        const query = encodeURIComponent(`${city}, ${state}, India`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=in`);
        const data = await res.json();
        if (data && data.length > 0) {
            return [parseFloat(data[0].lon), parseFloat(data[0].lat)]; // [lng, lat]
        }
    } catch (error) {
        console.error('Geocoding failed:', error);
    }
    return null;
};

/**
 * Validates if a location is within India
 */
export const isLocationInIndia = (countryCode: string): boolean => {
    return !!countryCode && countryCode.toLowerCase() === 'in';
};
