import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import { siteConfig } from '@/lib/config';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { credential } = await req.json();

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return NextResponse.json({ error: 'Invalid Google Token' }, { status: 400 });
        }

        const { email: rawEmail, name, picture, sub: googleId } = payload;
        const email = rawEmail.toLowerCase();

        // --- BLACKLIST ENFORCEMENT ---
        const Blacklist = (await import('@/models/Blacklist')).default;
        const isBlacklisted = await Blacklist.findOne({ email });
        if (isBlacklisted) {
            return NextResponse.json({ 
                error: "Access Restricted: This account has been permanently suspended for violating community safety guidelines. If you believe this is an error, please contact ReCircle Support." 
            }, { status: 403 });
        }

        // Search for user by either email OR googleId
        const user = await User.findOne({
            $or: [{ email }, { googleId }]
        }).select('+password');

        if (!user) {
            // New user: Return data for auto-fill in register page
            return NextResponse.json({
                exists: false,
                googleData: {
                    name,
                    email,
                    profilePicture: picture,
                    googleId
                }
            }, { status: 200 });
        }

        // Block banned users from logging in via Google (auto-unban if expired)
        if (user.status === 'Banned') {
            if (user.bannedUntil && new Date() > new Date(user.bannedUntil)) {
                user.status = 'Active';
                user.bannedUntil = undefined;
                await user.save();
            } else {
                const expiryMsg = user.bannedUntil 
                    ? ` Your ban expires on ${new Date(user.bannedUntil).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}.`
                    : ' Access will remain restricted until moderation is complete.';
                
                const isShadowBan = user.bio === 'Account self-deactivated while under moderation review.'; // Detected from self-deletion logic

                return NextResponse.json(
                    { 
                        error: isShadowBan 
                            ? "Account Frozen: Your profile is currently under safety review and cannot be re-activated at this time. Please contact ReCircle Support."
                            : `Your account has been banned.${expiryMsg} To appeal, contact ${siteConfig.supportEmail}` 
                    },
                    { status: 403 }
                );
            }
        }

        // Link Google ID if user exists by email but hasn't linked Google yet
        if (!user.googleId) {
            user.googleId = googleId;
            // They are a "both" user if they have a password, otherwise "google"
            user.authProvider = user.password ? 'both' : 'google';
            user.isVerified = true;
            await user.save();
        }

        // --- Community Auto-Verification (New) ---
        const Community = (await import('@/models/Community')).default;
        const emailDomain = user.email.split('@')[1];
        const matchingCommunities = await Community.find({
            isActive: true,
            emailDomains: emailDomain,
            _id: { $nin: user.verifiedCommunities || [] }
        });
        
        let newCommunityNames: string[] = [];
        if (matchingCommunities.length > 0) {
            const newIds = matchingCommunities.map(c => c._id);
            await User.updateOne(
                { _id: user._id },
                { $addToSet: { verifiedCommunities: { $each: newIds } } }
            );
            newCommunityNames = matchingCommunities.map(c => c.name);
        }

        // Re-fetch populated user to ensure frontend has all details
        const populatedUser = await User.findById(user._id)
            .populate('verifiedCommunities', 'name image isActive hostels')
            .lean();

        if (!populatedUser) throw new Error('User not found after update');

        const token = generateToken({ userId: user._id, email: user.email, role: user.role });

        const response = NextResponse.json(
            {
                message: 'Login successful',
                newCommunityJoined: newCommunityNames.length > 0,
                newCommunityNames,
                user: {
                    id: populatedUser._id,
                    name: populatedUser.name,
                    username: populatedUser.username,
                    email: populatedUser.email,
                    role: populatedUser.role,
                    profilePicture: populatedUser.profilePicture,
                    wishlist: populatedUser.wishlist || [],
                    wishlistedServices: populatedUser.wishlistedServices || [],
                    isVerified: populatedUser.isVerified,
                    verifiedCommunities: populatedUser.verifiedCommunities || [],
                    authProvider: populatedUser.authProvider,
                    defaultCommunity: populatedUser.defaultCommunity,
                    defaultHostel: populatedUser.defaultHostel
                }
            },
            { status: 200 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !req.nextUrl.hostname.includes('192.168.') && !req.nextUrl.hostname.includes('10.') && !req.nextUrl.hostname.includes('localhost'),
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Google Auth Error:', error);
        return NextResponse.json({ error: `Google authentication failed: ${error.message}` }, { status: 500 });
    }
}
