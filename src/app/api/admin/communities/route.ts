import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Community from '@/models/Community';
import { verifyToken } from '@/lib/auth';

// Helper to check admin status
async function isAdmin(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return false;
    const decoded = verifyToken(token);
    return decoded && decoded.role === 'admin';
}

export async function GET(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        await connectToDatabase();
        const communities = await Community.find().sort({ createdAt: -1 });
        return NextResponse.json({ communities });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        await connectToDatabase();
        const { name, emailDomains, description } = await req.json();

        if (!name || !emailDomains || !Array.isArray(emailDomains)) {
            return NextResponse.json({ error: 'Name and email domains array are required' }, { status: 400 });
        }

        const community = await Community.create({
            name,
            emailDomains: emailDomains.map(d => d.toLowerCase().trim()),
            description,
            isActive: true
        });

        return NextResponse.json({ community }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await Community.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Community deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
