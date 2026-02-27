import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');

        const USERNAME_REGEX = /^[a-z](?!.*[._]{2})[a-z0-9._]{2,18}[a-z0-9]$/;
        if (!username || !USERNAME_REGEX.test(username)) {
            return NextResponse.json({ available: false, error: 'Invalid format' }, { status: 200 });
        }

        await connectToDatabase();
        const existing = await User.findOne({ username });

        return NextResponse.json({ available: !existing }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
