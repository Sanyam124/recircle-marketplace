
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Service from '@/models/Service';

export async function GET() {
    try {
        await connectToDatabase();

        // Use distinct on both collections to get all cities
        // Filters for active/available items to only show cities with actual listings
        const [productCities, serviceCities] = await Promise.all([
            Product.distinct('location.city', { 
                'location.city': { $exists: true, $ne: '' },
                status: 'Available',
                visibility: 'Public'
            }),
            Service.distinct('location.city', { 
                'location.city': { $exists: true, $ne: '' },
                status: 'Active',
                visibility: 'Public'
            })
        ]);

        // Merge and unique
        const allCities = Array.from(new Set([...productCities, ...serviceCities]))
            .filter(Boolean)
            .sort()
            .map(city => ({ name: city, count: 0 })); // Simplified for now, or could count

        return NextResponse.json({ cities: allCities }, { status: 200 });

    } catch (error) {
        console.error('Error fetching cities:', error);
        return NextResponse.json({ cities: [] }, { status: 500 });
    }
}
