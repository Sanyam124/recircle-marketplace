import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectToDatabase();
    const user = await User.findById(decoded.userId).select('notifyOffers notifyMessages');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      notifyOffers: user.notifyOffers ?? true,
      notifyMessages: user.notifyMessages ?? true
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { notifyOffers, notifyMessages } = await req.json();

    await connectToDatabase();
    
    // Construct the update object based on what was passed
    const update: any = {};
    if (typeof notifyOffers === 'boolean') update.notifyOffers = notifyOffers;
    if (typeof notifyMessages === 'boolean') update.notifyMessages = notifyMessages;

    await User.findByIdAndUpdate(decoded.userId, { $set: update });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
