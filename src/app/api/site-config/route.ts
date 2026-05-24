import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import SiteSettings from '@/models/SiteSettings';

// GET — public endpoint for frontend to fetch categories, conditions, etc.
export async function GET(_req: NextRequest) {
    try {
        await connectToDatabase();
        const settings = await SiteSettings.getSingleton();

        return NextResponse.json({
            productCategories: settings.productCategories,
            serviceCategories: settings.serviceCategories,
            serviceAvailability: settings.serviceAvailability,
            defaultAvatars: settings.defaultAvatars,
            defaultBanners: settings.defaultBanners,
            productConditions: settings.productConditions,
            maxProductImages: settings.maxProductImages,
            maxServiceImages: settings.maxServiceImages,
            maxPriceProduct: settings.maxPriceProduct,
            maxPriceService: settings.maxPriceService,
            minPrice: settings.minPrice,
            maintenanceMode: settings.maintenanceMode,
            newListingsEnabled: settings.newListingsEnabled,
            newRegistrationsEnabled: settings.newRegistrationsEnabled,
            apiRateLimitGeneral: settings.apiRateLimitGeneral,
            apiRateLimitAuth: settings.apiRateLimitAuth,
            maxReportOtherChars: settings.maxReportOtherChars,
            maxReviewChars: settings.maxReviewChars,
            maxOfferMessageChars: settings.maxOfferMessageChars,
            maxBoardPostChars: settings.maxBoardPostChars,
            maxBoardReplyChars: settings.maxBoardReplyChars,
            maxSearchChars: settings.maxSearchChars,
            maxProductNameChars: settings.maxProductNameChars,
            maxProductDescriptionChars: settings.maxProductDescriptionChars,
            maxServiceNameChars: settings.maxServiceNameChars,
            maxServiceDescriptionChars: settings.maxServiceDescriptionChars,
            maxMessageChars: settings.maxMessageChars,
            maxUserNameChars: settings.maxUserNameChars,
            maxUserBioChars: settings.maxUserBioChars,
            maxCommunityNameChars: settings.maxCommunityNameChars,
            maxCommunityDescriptionChars: settings.maxCommunityDescriptionChars,
        }, { status: 200 });
    } catch (error) {
        console.error('Site Config Error:', error);
        // Return hardcoded defaults as fallback
        return NextResponse.json({
            productCategories: [
              'Textbooks', 'Study Notes', 'Stationery', 'Electronics', 'Gadgets',
              'Men\'s Wear', 'Women\'s Wear', 'Casual Wear', 'Formal Wear', 'Traditional & Ethnic',
              'T-Shirts', 'Winter Wear', 'Activewear', 'Costumes', 'Footwear', 'Accessories',
              'Bags', 'Luggage', 'Storage', 'Organizers', 'Hostel Essentials', 'Room Decor',
              'Furniture', 'Appliances', 'Sports Equipment', 'Fitness Gear', 'Bicycles',
              'Vehicles', 'Musical Instruments', 'Gaming', 'Art Supplies', 'Drafting Tools',
              'Lab Equipment', 'Microcontrollers & Sensors', 'Project Materials',
              'Exam Survival Kits', 'Event Passes & Tickets', 'Subscriptions & Digital', 'Other'
            ],
            serviceCategories: [
              'Tutoring', 'Academic Mentoring', 'Assignment Help', 'Project Assistance',
              'Tech Support', 'Device Repair', 'Graphic Design', 'Video Editing',
              'Photography', 'Videography', 'Content Writing', 'Proofreading',
              'Resume Building', 'Interview Prep', 'Room Cleaning', 'Laundry Services',
              'Moving Assistance', 'Packing Services', 'Delivery Services', 'Fitness Coaching',
              'Sports Training', 'Event Organizing', 'DJ Services', 'Roommate Matching',
              'Sublets & Leases', 'Carpooling & Rides', 'Skill Swapping',
              'Lost & Found (Bounties)', 'E-Sports Teammates', 'Other'
            ],
            serviceAvailability: ['🗓️ Flexible', '🏠 Weekends', '🌙 Evening', '☀️ Daytime'],
            defaultAvatars: [
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879627/recircle/defaults/avatars/qgkgztxivymqpykcln9l.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879647/recircle/defaults/avatars/ziodytpld8wihr98ist3.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879674/recircle/defaults/avatars/ujoj8pesdwygl7prxhop.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879713/recircle/defaults/avatars/xlbrrk5k8fwajdg7atrd.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/q_auto/f_auto/v1779185337/Copilot_20260411_092250_wl7rnn.png",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879809/recircle/defaults/avatars/f12ns9fpdk9vapfe3rso.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879826/recircle/defaults/avatars/njihd9oj1h1glmzuoinj.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879850/recircle/defaults/avatars/jpsd54f4ecrj7cjaxqzx.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879876/recircle/defaults/avatars/ulsdike1w01t9jej98jk.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879909/recircle/defaults/avatars/jubqhz3y1c2nialsskyk.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880073/recircle/defaults/avatars/ozw4w9mtamtwceivlqeg.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880093/recircle/defaults/avatars/m9e7dxc3jgkn63m78iod.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880201/recircle/defaults/avatars/xsycxnxgogtxl7mnab3k.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880241/recircle/defaults/avatars/n9s9vww8e4oyvdrpsvyf.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880375/recircle/defaults/avatars/ucpa2c3mhc463fweeceg.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880395/recircle/defaults/avatars/y0lecpk6ljmgwubxcrjd.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880512/recircle/defaults/avatars/ffmvy7tvldj5j7goij0f.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880578/recircle/defaults/avatars/kboynwhyyylpdymscflg.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880596/recircle/defaults/avatars/adrlyespwr2nisogppyx.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881528/recircle/defaults/avatars/yybdriyqunh4ja51n9fx.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881545/recircle/defaults/avatars/ygldm1alqtpzmfj0vzyt.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881575/recircle/defaults/avatars/ef0jnz9sj9noihldv0cj.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881609/recircle/defaults/avatars/phztoibugb66owdk3qn1.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881843/recircle/defaults/avatars/oluqzmzcp6vidvakutsu.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881865/recircle/defaults/avatars/vyll052nx0sn7pkpoy15.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881971/recircle/defaults/avatars/zsvvuu1tl9lftjkvsqts.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882001/recircle/defaults/avatars/urzgagig0ist1w70vbkq.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882116/recircle/defaults/avatars/vztuvy9ifmoyid7wsk2d.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882508/recircle/defaults/avatars/d7cpulnp0qgnk8oana7o.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882552/recircle/defaults/avatars/hg2uvgsalioeggawunvo.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882603/recircle/defaults/avatars/wgtkyyr93xsnklnx8zd4.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882949/recircle/defaults/avatars/aonclvo3yeuty9qopigl.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882965/recircle/defaults/avatars/xswlonkbehvlvgfcogy2.webp"
            ],
            defaultBanners: [
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884926/recircle/defaults/banners/uajyrck7hwyvtpayyjvg.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884927/recircle/defaults/banners/zqdh9puexp455fkyqf36.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884928/recircle/defaults/banners/rus9bykf5y3pzolfabte.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884928/recircle/defaults/banners/xpmuv5kyvoqzedzej5wp.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884929/recircle/defaults/banners/mnfbvgpadbmzzjmfd7db.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884930/recircle/defaults/banners/wavqltixgy5dfcnvuv7y.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884931/recircle/defaults/banners/l1kcurhb3gyrfilaiw8y.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884932/recircle/defaults/banners/ontd1mq3hvvd4zklnhol.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884933/recircle/defaults/banners/rnko4ck2wczrv34jzwu2.jpg"
            ],
            productConditions: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
            maxProductImages: 5,
            maxServiceImages: 5,
            maxPriceProduct: 1000000,
            maxPriceService: 100000,
            minPrice: 5,
            maintenanceMode: false,
            newListingsEnabled: true,
            newRegistrationsEnabled: true,
            apiRateLimitGeneral: 100,
            apiRateLimitAuth: 30,
            maxReportOtherChars: 1000,
            maxReviewChars: 1000,
            maxOfferMessageChars: 300,
            maxBoardPostChars: 500,
            maxBoardReplyChars: 300,
            maxSearchChars: 100,
            maxProductNameChars: 80,
            maxProductDescriptionChars: 2000,
            maxServiceNameChars: 80,
            maxServiceDescriptionChars: 2000,
            maxMessageChars: 2000,
            maxUserNameChars: 20,
            maxUserBioChars: 500,
            maxCommunityNameChars: 100,
            maxCommunityDescriptionChars: 500,
        }, { status: 200 });
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
