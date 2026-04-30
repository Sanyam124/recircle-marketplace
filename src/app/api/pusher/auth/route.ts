import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusherServer';
import { verifyToken } from '@/lib/auth';

/**
 * Pusher Channel Authentication
 * This secures real-time "private-" channels by ensuring only the 
 * intended user can subscribe to their own notification stream.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the User
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 2. Parse Pusher Auth Data
    // Pusher sends application/x-www-form-urlencoded
    const formData = await req.formData();
    const socketId = formData.get('socket_id') as string;
    const channelName = formData.get('channel_name') as string;

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // 3. Authorize the Specific Channel
    // Rule: User A can only subscribe to "private-user-[USER_A_ID]"
    const expectedChannel = `private-user-${decoded.userId}`;

    if (channelName !== expectedChannel) {
      console.warn(`Pusher Auth Failure: User ${decoded.userId} attempted to subscribe to unauthorized channel: ${channelName}`);
      return NextResponse.json({ error: 'Forbidden: You can only subscribe to your own private channel.' }, { status: 403 });
    }

    // 4. Generate & Return Pusher Auth Signature
    const authResponse = pusherServer.authorizeChannel(socketId, channelName);
    
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('Pusher Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
