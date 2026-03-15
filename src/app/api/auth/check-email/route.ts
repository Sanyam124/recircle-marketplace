import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user by email
        const user = await User.findOne({ email: normalizedEmail });

        if (user) {
            return NextResponse.json(
                { exists: true, message: 'Email found' },
                { status: 200 }
            );
        } else {
             return NextResponse.json(
                { exists: false, message: 'Email not found' },
                { status: 200 }
            );
        }

    } catch (error: any) {
        console.error('Check Email Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
