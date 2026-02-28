import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');

        const USERNAME_REGEX = /^(?![0-9]+$)(?!.*\.\.)[a-z0-9_][a-z0-9._]{1,18}[a-z0-9_]$/;
        if (!username || username.length < 3 || username.length > 20 || !USERNAME_REGEX.test(username)) {
            return NextResponse.json({ available: false, error: 'Invalid format' }, { status: 200 });
        }

        await connectToDatabase();
        const existing = await User.findOne({ username });

        return NextResponse.json({ available: !existing }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
