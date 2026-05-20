import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBanRule {
    reportThreshold: number;
    banDays: number;
}

export interface ISiteSettings extends Document {
    // Auto-Ban Rules
    autoBanRules: IBanRule[];
    autoBanEnabled: boolean;

    // Categories
    productCategories: string[];
    serviceCategories: string[];
    serviceAvailability: string[];
    defaultAvatars: string[];
    defaultBanners: string[];

    // Product Conditions (filter options)
    productConditions: string[];

    // Listing Limits
    maxProductImages: number;
    maxServiceImages: number;
    maxPriceProduct: number;
    maxPriceService: number;
    minPrice: number;

    // Rate Limits
    apiRateLimitGeneral: number;
    apiRateLimitAuth: number;

    // Platform Controls
    maintenanceMode: boolean;
    newRegistrationsEnabled: boolean;
    newListingsEnabled: boolean;

    // Email Settings
    banEmailEnabled: boolean;
    otpEmailEnabled: boolean;

    // Character Limits
    maxReportOtherChars: number;
    maxReviewChars: number;
    maxOfferMessageChars: number;
    maxBoardPostChars: number;
    maxBoardReplyChars: number;
    maxSearchChars: number;
    autoRemoveThreshold: number;

    // Detailed Rate Limits (Dynamic)
    loginMaxAttempts: number;
    loginLockoutMins: number;
    otpSendCooldownSecs: number;
    otpVerifyMaxAttempts: number;
    otpVerifyLockoutMins: number;
    ipLimitLoginPerHour: number;
    ipLimitRegisterPerHour: number;
    ipLimitOtpSendPerHour: number;
    ipLimitOtpVerifyPerHour: number;
    ipLimitCheckEmailPerHour: number;
    ipLimitResetPasswordPerHour: number;

    // Advanced OTP Protection
    maxOtpPerEmailPerHour: number;
    globalDailyOtpLimit: number;

    // User Account Limits
    maxListingsPerUser: number;

    // SMTP Selection
    activeSmtpIndex: number;

    updatedAt: Date;
}

const SiteSettingsSchema: Schema<ISiteSettings> = new Schema(
    {
        autoBanRules: {
            type: [{ reportThreshold: { type: Number, required: true }, banDays: { type: Number, required: true } }],
            default: [
                { reportThreshold: 5, banDays: 7 },
                { reportThreshold: 12, banDays: 30 },
                { reportThreshold: 20, banDays: 90 },
            ],
        },
        autoBanEnabled: { type: Boolean, default: true },

        productCategories: {
            type: [String],
            default: [
              'Textbooks', 'Study Notes', 'Stationery', 'Electronics', 'Gadgets',
              'Men\'s Wear', 'Women\'s Wear', 'Casual Wear', 'Formal Wear', 'Traditional & Ethnic',
              'T-Shirts', 'Winter Wear', 'Activewear', 'Costumes', 'Footwear', 'Accessories',
              'Bags', 'Luggage', 'Storage', 'Organizers', 'Hostel Essentials', 'Room Decor',
              'Furniture', 'Appliances', 'Sports Equipment', 'Fitness Gear', 'Bicycles',
              'Vehicles', 'Musical Instruments', 'Gaming', 'Art Supplies', 'Drafting Tools',
              'Lab Equipment', 'Microcontrollers & Sensors', 'Project Materials',
              'Exam Survival Kits', 'Event Passes & Tickets', 'Subscriptions & Digital', 'Other'
            ],
        },
        serviceCategories: {
            type: [String],
            default: [
              'Tutoring', 'Academic Mentoring', 'Assignment Help', 'Project Assistance',
              'Tech Support', 'Device Repair', 'Graphic Design', 'Video Editing',
              'Photography', 'Videography', 'Content Writing', 'Proofreading',
              'Resume Building', 'Interview Prep', 'Room Cleaning', 'Laundry Services',
              'Moving Assistance', 'Packing Services', 'Delivery Services', 'Fitness Coaching',
              'Sports Training', 'Event Organizing', 'DJ Services', 'Roommate Matching',
              'Sublets & Leases', 'Carpooling & Rides', 'Skill Swapping',
              'Lost & Found (Bounties)', 'E-Sports Teammates', 'Other'
            ],
        },
        serviceAvailability: {
            type: [String],
            default: ['🗓️ Flexible', '🏠 Weekends', '🌙 Evening', '☀️ Daytime'],
        },
        defaultAvatars: {
            type: [String],
            default: [
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
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881609/recircle/defaults/avatars/rx4btjxpgncuq05sxnns.webp",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881609/recircle/defaults/avatars/sp9esvheofyzhix8iymk.webp",
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
        },
        defaultBanners: {
            type: [String],
            default: [
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884926/recircle/defaults/banners/uajyrck7hwyvtpayyjvg.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884927/recircle/defaults/banners/zqdh9puexp455fkyqf36.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884928/recircle/defaults/banners/rus9bykf5y3pzolfabte.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884928/recircle/defaults/banners/xpmuv5kyvoqzedzej5wp.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884929/recircle/defaults/banners/mnfbvgpadbmzzjmfd7db.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884930/recircle/defaults/banners/wavqltixgy5dfcnvuv7y.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884931/recircle/defaults/banners/l1kcurhb3gyrfilaiw8y.jpg",
                "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884933/recircle/defaults/banners/rnko4ck2wczrv34jzwu2.jpg"
            ],
        },
        productConditions: {
            type: [String],
            default: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
        },

        maxProductImages: { type: Number, default: 5 },
        maxServiceImages: { type: Number, default: 5 },
        maxPriceProduct: { type: Number, default: 1000000 },
        maxPriceService: { type: Number, default: 100000 },
        minPrice: { type: Number, default: 5 },

        maxListingsPerUser: { type: Number, default: 100 },

        apiRateLimitGeneral: { type: Number, default: 100 },
        apiRateLimitAuth: { type: Number, default: 30 },

        maintenanceMode: { type: Boolean, default: false },
        newRegistrationsEnabled: { type: Boolean, default: true },
        newListingsEnabled: { type: Boolean, default: true },

        banEmailEnabled: { type: Boolean, default: true },
        otpEmailEnabled: { type: Boolean, default: true },

        maxReportOtherChars: { type: Number, default: 1000 },
        maxReviewChars: { type: Number, default: 1000 },
        maxOfferMessageChars: { type: Number, default: 300 },
        maxBoardPostChars: { type: Number, default: 500 },
        maxBoardReplyChars: { type: Number, default: 300 },
        maxSearchChars: { type: Number, default: 100 },
        autoRemoveThreshold: { type: Number, default: 5 },

        // Detailed Rate Limits (Dynamic)
        loginMaxAttempts: { type: Number, default: 5 },
        loginLockoutMins: { type: Number, default: 15 },
        otpSendCooldownSecs: { type: Number, default: 60 },
        otpVerifyMaxAttempts: { type: Number, default: 3 },
        otpVerifyLockoutMins: { type: Number, default: 5 },
        ipLimitLoginPerHour: { type: Number, default: 50 },
        ipLimitRegisterPerHour: { type: Number, default: 5 },
        ipLimitOtpSendPerHour: { type: Number, default: 10 },
        ipLimitOtpVerifyPerHour: { type: Number, default: 20 },
        ipLimitCheckEmailPerHour: { type: Number, default: 20 },
        ipLimitResetPasswordPerHour: { type: Number, default: 5 },

        // Advanced OTP Protection
        maxOtpPerEmailPerHour: { type: Number, default: 5 },
        globalDailyOtpLimit: { type: Number, default: 400 },

        // SMTP Selection
        activeSmtpIndex: { type: Number, default: 1 },
    },
    { timestamps: true }
);

// Singleton helper — always returns the one and only settings document
SiteSettingsSchema.statics.getSingleton = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    // Proactively clean up the broken default banner from the persistent database document
    if (settings.defaultBanners && settings.defaultBanners.includes("https://res.cloudinary.com/dq3sl82at/image/upload/v1775884934/recircle/defaults/banners/ulb2vmptaa6e6gayhzxu.jpg")) {
        settings.defaultBanners = settings.defaultBanners.filter((url: string) => url !== "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884934/recircle/defaults/banners/ulb2vmptaa6e6gayhzxu.jpg");
        await settings.save();
    }
    return settings;
};

if (mongoose.models.SiteSettings) {
    const currentSchema = mongoose.models.SiteSettings.schema;
    if (!currentSchema.path('autoBanRules') || !currentSchema.path('defaultAvatars') || !currentSchema.path('defaultBanners') || !currentSchema.path('maintenanceMode') || !currentSchema.path('serviceAvailability') || !currentSchema.path('ipLimitLoginPerHour') || !currentSchema.path('globalDailyOtpLimit')) {
        delete mongoose.models.SiteSettings;
    }
}

const SiteSettings: Model<ISiteSettings> & { getSingleton: () => Promise<ISiteSettings> } =
    (mongoose.models.SiteSettings || mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema)) as any;

export default SiteSettings;
