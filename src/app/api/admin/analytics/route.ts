import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Order from '@/models/Order';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Authentication & Authorization (Admin Only)
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        await connectToDatabase();

        // 2. User Metrics
        const totalUsers = await User.countDocuments();
        const verifiedUsers = await User.countDocuments({ isVerified: true });

        // Calculate new signups in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentSignups = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

        // 3. Marketplace Inventory Health
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ status: 'Available' });
        const soldProductsCount = await Product.countDocuments({ status: 'Sold' });
        const reservedProducts = await Product.countDocuments({ status: 'Reserved' });

        const totalServices = await Service.countDocuments();
        const activeServices = await Service.countDocuments({ status: 'Active' });
        const inactiveServices = await Service.countDocuments({ status: 'Inactive' });

        // 4. Transaction Volume & GTV (Gross Transaction Value)
        const totalOrders = await Order.countDocuments();
        const totalProductOrders = await Order.countDocuments({ orderType: 'Product' });
        const totalServiceOrders = await Order.countDocuments({ orderType: 'Service_Appointment' });

        const completedOrdersCount = await Order.countDocuments({ status: 'Completed' });
        const completedProductOrders = await Order.countDocuments({ status: 'Completed', orderType: 'Product' });
        const completedServiceOrders = await Order.countDocuments({ status: 'Completed', orderType: 'Service_Appointment' });

        const cancelledOrdersCount = await Order.countDocuments({ status: 'Cancelled' });
        const cancelledProductOrders = await Order.countDocuments({ status: 'Cancelled', orderType: 'Product' });
        const cancelledServiceOrders = await Order.countDocuments({ status: 'Cancelled', orderType: 'Service_Appointment' });

        const pendingStatuses = ['Scheduled'];
        const pendingOrdersCount = await Order.countDocuments({ status: { $in: pendingStatuses } });
        const pendingProductOrders = await Order.countDocuments({ status: { $in: pendingStatuses }, orderType: 'Product' });
        const pendingServiceOrders = await Order.countDocuments({ status: { $in: pendingStatuses }, orderType: 'Service_Appointment' });

        // Calculate GTV using aggregation
        const gtvPipeline = await Order.aggregate([
            { $match: { status: 'Completed' } },
            { $group: { _id: null, totalValue: { $sum: '$totalAmount' } } }
        ]);
        const gtv = gtvPipeline.length > 0 ? gtvPipeline[0].totalValue : 0;

        // 5. Removed Liquidity logic; moved product counts to 'Marketplace Inventory Health'

        // 6. Moderation Backlog (Requires Attention)
        // Dispute model not yet implemented
        const openDisputes = 0;
        const pendingReports = await Report.countDocuments({ status: 'Pending' });

        // 7. Recent Activity Streams (Last 5)
        const latestUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt');
        const latestOrders = await Order.find()
            .populate('buyer', 'name')
            .populate('seller', 'name')
            .populate('product', 'title')
            .populate('service', 'title')
            .sort({ createdAt: -1 })
            .limit(5)
            .select('buyer seller product service status totalAmount orderType _id createdAt');

        // 8. Registration Timeseries Graph Data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        const dailySignups = await User.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
                emailCount: { $sum: { $cond: [{ $eq: ["$authProvider", "email"] }, 1, 0] } },
                googleCount: { $sum: { $cond: [{ $in: ["$authProvider", ["google", "both"]] }, 1, 0] } }
            }},
            { $sort: { _id: 1 } }
        ]);

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        const monthlySignups = await User.aggregate([
             { $match: { createdAt: { $gte: twelveMonthsAgo } } },
             { $group: {
                 _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                 count: { $sum: 1 },
                 emailCount: { $sum: { $cond: [{ $eq: ["$authProvider", "email"] }, 1, 0] } },
                 googleCount: { $sum: { $cond: [{ $in: ["$authProvider", ["google", "both"]] }, 1, 0] } }
             }},
             { $sort: { _id: 1 } }
        ]);

        // 9. SMTP Timeseries Data
        const SmtpUsage = (await import('@/models/SmtpUsage')).default;
        
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
        const dailySmtp = await SmtpUsage.find({ dateId: { $gte: thirtyDaysAgoStr } }).sort({ dateId: 1 }).lean();

        const monthlySmtp = await SmtpUsage.aggregate([
             { $match: { dateId: { $gte: twelveMonthsAgo.toISOString().split('T')[0] } } },
             { $group: {
                 _id: { $substr: ["$dateId", 0, 7] }, // gets YYYY-MM
                 smtp1: { $sum: "$smtp1" },
                 smtp2: { $sum: "$smtp2" },
                 smtp3: { $sum: "$smtp3" }
             }},
             { $sort: { _id: 1 } }
        ]);

        // Compile Final Payload
        const analyticsData = {
            users: {
                total: totalUsers,
                verified: verifiedUsers,
                recentSignups
            },
            inventory: {
                products: {
                    total: totalProducts,
                    active: activeProducts,
                    sold: soldProductsCount,
                    reserved: reservedProducts
                },
                services: {
                    total: totalServices,
                    active: activeServices,
                    inactive: inactiveServices
                }
            },
            transactions: {
                totalOrders,
                productOrders: totalProductOrders,
                serviceOrders: totalServiceOrders,
                completedOrders: completedOrdersCount,
                completedProductOrders,
                completedServiceOrders,
                cancelledOrders: cancelledOrdersCount,
                cancelledProductOrders,
                cancelledServiceOrders,
                pendingOrders: pendingOrdersCount,
                pendingProductOrders,
                pendingServiceOrders,
                grossVolume: gtv
            },
            moderation: {
                openDisputes,
                pendingReports
            },
            activityStream: {
                latestUsers,
                latestOrders
            },
            graphs: {
                dailySignups,
                monthlySignups,
                dailySmtp,
                monthlySmtp
            }
        };

        return NextResponse.json(analyticsData, { status: 200 });

    } catch (error: any) {
        console.error('Admin Analytics Error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
    }
}
