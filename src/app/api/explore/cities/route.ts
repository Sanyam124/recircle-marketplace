import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Service from '@/models/Service';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        // Get counts for each city from products
        const productStats = await Product.aggregate([
            { $match: { 'location.city': { $ne: null } } },
            { $group: { _id: '$location.city', count: { $sum: 1 } } }
        ]);

        // Get counts for each city from services
        const serviceStats = await Service.aggregate([
            { $match: { 'location.city': { $ne: null } } },
            { $group: { _id: '$location.city', count: { $sum: 1 } } }
        ]);

        // Merge stats
        const cityMap: { [key: string]: number } = {};
        
        productStats.forEach(s => {
            cityMap[s._id] = (cityMap[s._id] || 0) + s.count;
        });
        
        serviceStats.forEach(s => {
            cityMap[s._id] = (cityMap[s._id] || 0) + s.count;
        });

        const cities = Object.entries(cityMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count); // Sort by count descending

        return NextResponse.json({ cities }, { status: 200 });
    } catch (error: any) {
        console.error('Fetch Cities Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
