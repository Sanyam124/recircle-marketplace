import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userPayload = verifyToken(token);
    if (!userPayload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { subscription } = await req.json();
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription missing' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Store subscription object as a JSON string
    await User.findByIdAndUpdate(userPayload.userId, {
      pushSubscription: JSON.stringify(subscription)
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper to remove subscription (Unsubscribe)
export async function DELETE(req: NextRequest) {
    try {
      const token = req.cookies.get('token')?.value;
      if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const userPayload = verifyToken(token);
      if (!userPayload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  
      await connectToDatabase();
      await User.findByIdAndUpdate(userPayload.userId, {
        $unset: { pushSubscription: "" }
      });
  
      return NextResponse.json({ success: true });
    } catch (err: any) {
      console.error('Unsubscribe error:', err);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
