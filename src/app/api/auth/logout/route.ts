import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json(
        { message: 'Logged out successfully' },
        { status: 200 }
    );

    response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0), // Expire immediately
        path: '/',
    });

    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
}
