
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Service from '@/models/Service';

export async function GET() {
    try {
        await connectToDatabase();

        // Aggregate location data from both collections
        const productLocations = await Product.aggregate([
            { $match: { status: 'Available', visibility: 'Public', 'location.state': { $exists: true, $ne: '' }, 'location.city': { $exists: true, $ne: '' } } },
            { $group: { _id: { state: '$location.state', city: '$location.city' } } }
        ]);

        const serviceLocations = await Service.aggregate([
            { $match: { status: 'Active', visibility: 'Public', 'location.state': { $exists: true, $ne: '' }, 'location.city': { $exists: true, $ne: '' } } },
            { $group: { _id: { state: '$location.state', city: '$location.city' } } }
        ]);

        const stateCityMap: Record<string, Set<string>> = {};

        [...productLocations, ...serviceLocations].forEach(doc => {
            const state = doc._id.state;
            const city = doc._id.city;
            if (!stateCityMap[state]) {
                stateCityMap[state] = new Set();
            }
            stateCityMap[state].add(city);
        });

        const formattedData: Record<string, string[]> = {};
        Object.keys(stateCityMap).sort().forEach(state => {
            formattedData[state] = Array.from(stateCityMap[state]).sort();
        });

        return NextResponse.json({ locations: formattedData }, { status: 200 });

    } catch (error) {
        console.error('Error fetching locations:', error);
        return NextResponse.json({ locations: {} }, { status: 500 });
    }
}
