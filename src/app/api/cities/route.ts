
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Service from '@/models/Service';

export async function GET() {
    try {
        await connectToDatabase();

        // Aggregate location data from both collections with counts
        const productCounts = await Product.aggregate([
            { $match: { 
                status: 'Available', 
                'location.state': { $exists: true, $ne: '' }, 
                'location.city': { $exists: true, $ne: '' } 
            } },
            { $group: { 
                _id: { state: '$location.state', city: '$location.city' }, 
                count: { $sum: 1 } 
            } }
        ]);

        const serviceCounts = await Service.aggregate([
            { $match: { 
                status: 'Active', 
                'location.state': { $exists: true, $ne: '' }, 
                'location.city': { $exists: true, $ne: '' } 
            } },
            { $group: { 
                _id: { state: '$location.state', city: '$location.city' }, 
                count: { $sum: 1 } 
            } }
        ]);

        const locationStats: Record<string, { total: number, cities: Record<string, number> }> = {};

        [...productCounts, ...serviceCounts].forEach(doc => {
            const state = doc._id.state;
            const city = doc._id.city;
            const count = doc.count;

            if (!locationStats[state]) {
                locationStats[state] = { total: 0, cities: {} };
            }
            locationStats[state].total += count;
            locationStats[state].cities[city] = (locationStats[state].cities[city] || 0) + count;
        });

        // Format for backward compatibility while adding new structured data
        const locationsMap: Record<string, string[]> = {};
        const stats: any = {};

        Object.keys(locationStats).sort().forEach(state => {
            locationsMap[state] = Object.keys(locationStats[state].cities).sort();
            stats[state] = {
                count: locationStats[state].total,
                cities: locationStats[state].cities
            };
        });

        return NextResponse.json({ 
            locations: locationsMap, // Keeping this for compatibility
            stats: stats 
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching locations:', error);
        return NextResponse.json({ locations: {} }, { status: 500 });
    }
}
