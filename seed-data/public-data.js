const PUBLIC_PRODUCTS = [
  {
    title: "iPhone 13 Pro (128GB, Graphite Black)",
    price: 45000,
    category: "Electronics",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800",
    description: "Selling my iPhone 13 Pro in Graphite color, 128GB storage variant. The battery health is currently at 84%, which easily lasts a full day of standard use. There are minor micro-scratches on the stainless steel sides from normal case wear, but the front display and back glass are absolutely flawless as they have always been protected with tempered glass and a Spigen case. Comes with the original retail box, unused USB-C to Lightning cable, and 2 premium cases for free. Selling because I upgraded to the newer series.",
    isLong: true
  },
  {
    title: "OnePlus Nord CE 3 Lite 5G (8GB RAM, 128GB)",
    price: 14500,
    category: "Gadgets",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
    description: "Selling OnePlus Nord CE 3 Lite in Pastel Lime color. Only 6 months old, looks and feels brand new with zero scratches. Includes 67W SuperVOOC charger.",
    isLong: false
  },
  {
    title: "HP Pavilion 15 Laptop (Ryzen 5, 16GB, 512GB SSD)",
    price: 38000,
    category: "Electronics",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800",
    description: "Highly robust HP Pavilion laptop with AMD Ryzen 5 5600H processor, 16GB DDR4 RAM, and ultra-fast 512GB NVMe SSD. Perfect for coding, graphic design, and moderate gaming (NVIDIA GTX 1650 graphics card). The screen is a 15.6-inch Full HD IPS anti-glare display with excellent viewing angles. The keyboard is backlit and in perfect working order. The battery backup is around 4-5 hours of productivity work. Cleaned regularly, thermal paste replaced 2 months ago. Comes with original power brick.",
    isLong: true
  },
  {
    title: "boAt Stone 350 10W Portable Speaker",
    price: 1200,
    category: "Gadgets",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800",
    description: "boAt Stone 350 IPX7 water-resistant portable wireless speaker in active black color. Perfect for hostel rooms and outdoor parties. Box and charging cable included.",
    isLong: false
  },
  {
    title: "Sony WH-1000XM4 Noise Cancelling Headphones",
    price: 16500,
    category: "Gadgets",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    description: "Industry-leading active noise canceling wireless headphones in silver color. Impeccable sound clarity with smart touch gesture controls, wear detection, and multi-point bluetooth connection. Cushions are extremely comfortable and show very minimal wear. Battery life is stellar, lasting up to 30 hours on a single charge. Comes with the premium hard carrying case, 3.5mm audio jack cable, flight adapter, and charging cable. Selling as I switched to earbuds.",
    isLong: true
  },
  {
    title: "Apple Watch SE (44mm, GPS, Space Grey)",
    price: 18000,
    category: "Gadgets",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800",
    description: "Selling Apple Watch SE (44mm size, Space Grey Aluminum case). Perfect companion for fitness tracking, heart rate monitoring, and receiving notifications. Comes with standard black sport band and a magnetic fast charging cable.",
    isLong: false
  },
  {
    title: "Canon EOS 1500D DSLR Camera with Kit Lens",
    price: 26000,
    category: "Electronics",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
    description: "Canon EOS 1500D DSLR camera equipped with the standard EF-S 18-55mm f/3.5-5.6 IS II lens. Perfect camera for students starting out in photography or content creation. Boasts a 24.1 Megapixel APS-C CMOS sensor for gorgeous details, built-in Wi-Fi and NFC for instant photo sharing to your smartphone, and 9-point autofocus system. Hardly used, shutter count is less than 3,500 shots. Included are the original box, strap, neck pad, battery charger, 16GB high-speed SD card, and a shockproof camera bag.",
    isLong: true
  },
  {
    title: "Logitech G502 Hero High Performance Gaming Mouse",
    price: 3200,
    category: "Gaming",
    condition: "New",
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800",
    description: "Brand new Logitech G502 Hero gaming mouse with 25K HERO sensor, custom RGB lighting, and adjustable weights. Unopened retail pack.",
    isLong: false
  },
  {
    title: "iPad Air (4th Gen, 64GB, Space Grey)",
    price: 29500,
    category: "Electronics",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800",
    description: "Apple iPad Air 4th Generation with 10.9-inch Liquid Retina Display. Powered by the incredibly fast A14 Bionic chip, perfect for digital sketching, note-taking, and streaming lectures. Works flawlessly with Apple Pencil (2nd Gen). Touch ID integrated in the top power button works instantaneously. Clean screen with a high-quality matte screen protector applied. Comes with a green magnetic tri-fold smart folio case and the original 20W USB-C charger.",
    isLong: true
  },
  {
    title: "Seagate Expansion 1TB External HDD",
    price: 2800,
    category: "Gadgets",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800",
    description: "Seagate 1TB external portable hard disk drive with USB 3.0 for super-fast data backup. Stored movies, engineering projects, and software backups. Plug-and-play setup.",
    isLong: false
  },
  {
    title: "Honda Activa 6G Scooter (2021, 15,000 km)",
    price: 52000,
    category: "Vehicles",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800",
    description: "Selling my Honda Activa 6G in metallic grey color. 2021 manufacture year, single owner, and driven strictly for campus commutes and daily errands around Vadodara. Gives an excellent mileage of 48-50 km/l. Serviced strictly on schedule every 3,000 km at standard Honda service centers (service history available). Brand new tubeless rear tyre installed recently. Insurance is valid till December 2026. Zero engine issues. Comes with double keys and steel guard accessories.",
    isLong: true
  },
  {
    title: "Royal Enfield Classic 350 Bike (2019, Dual ABS)",
    price: 135000,
    category: "Vehicles",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800",
    description: "Royal Enfield Classic 350 Gunmetal Grey with dual-channel ABS. Well maintained, single owner, pristine sound, and absolutely smooth cruiser ride. Vadodara registration.",
    isLong: false
  },
  {
    title: "Firefox Target 21-Speed Mountain Bicycle",
    price: 9500,
    category: "Bicycles",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800",
    description: "Selling my Firefox Target hybrid mountain bike. Features 21-speed Shimano Tourney gears, responsive front mechanical disc brakes, and zoom suspension fork to handle rough roads. Lightweight and highly durable steel alloy frame (18-inch frame size, suitable for heights 5'5 to 6'0). Upgraded with an ergonomic gel seat cover and a solid water bottle cage. Tyres are in excellent condition with deep thread grip. Perfect for daily fitness rides and city commuting.",
    isLong: true
  },
  {
    title: "Decathlon Rockrider ST10 Mountain Bike",
    price: 8000,
    category: "Bicycles",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800",
    description: "Decathlon Rockrider ST10 single-speed mountain bicycle. Extremely lightweight frame with linear pull brakes. Driven only on campus roads. Spotless condition.",
    isLong: false
  },
  {
    title: "Wakefit Orthopedic Memory Foam Mattress",
    price: 4500,
    category: "Hostel Essentials",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800",
    description: "Wakefit single size orthopedic memory foam mattress (72x36x5 inch). Specially designed to support natural spine alignment. Includes a removable, washable outer cover. No stains or sagging.",
    isLong: false
  },
  {
    title: "Ergonomic Office High-Back Mesh Chair",
    price: 3500,
    category: "Furniture",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=800",
    description: "Premium high-back office desk chair featuring a highly breathable mesh back, adjustable lumbar support, 2D padded armrests, and 135-degree tilt tension mechanism. Heavy duty nylon star base with smooth-rolling caster wheels that do not scratch tiled floors. Pneumatic gas lift height adjustment functions flawlessly. Extremely comfortable for long hours of exam study or desk jobs. Only 4 months old, selling due to relocation.",
    isLong: true
  },
  {
    title: "Engineered Wood Study Desk with Drawers",
    price: 2800,
    category: "Furniture",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800",
    description: "Sturdy study table made from premium engineered wood in dark wenge finish. Spacious tabletop for laptop and books, with 2 side storage drawers and footrest shelf.",
    isLong: false
  },
  {
    title: "Philips Air Fryer HD9200 (4.1L Capacity)",
    price: 4500,
    category: "Appliances",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=800",
    description: "Philips Viva Collection digital air fryer. Cook healthy meals with up to 90% less oil. Used only for making fries and grilled paneer. Spotless interior.",
    isLong: false
  },
  {
    title: "Prestige 1200W Electric Induction Cooktop",
    price: 1800,
    category: "Appliances",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
    description: "Prestige induction cooktop with Indian menu options, automatic voltage regulator, and easy-clean touch buttons. Flat glass panel is clean and free of cracks. Works perfectly.",
    isLong: false
  },
  {
    title: "Yonex Muscle Power 29 Badminton Racquets",
    price: 1900,
    category: "Sports Equipment",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800",
    description: "Pair of genuine Yonex Muscle Power 29 badminton racquets. Features isometric head shape for massive sweet spot and high tension strings. Full cover bag included.",
    isLong: false
  },
  {
    title: "Adjustable Cast Iron Dumbbells Set (20KG)",
    price: 2500,
    category: "Fitness Gear",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800",
    description: "Complete adjustable dumbbell set containing 4 x 2.5kg plates, 4 x 1.25kg plates, 2 x chrome bars, and spinlocks. Total weight 20kg. Excellent set for home gyms.",
    isLong: false
  },
  {
    title: "Banarasi Silk Saree (Royal Red & Golden Border)",
    price: 2500,
    category: "Traditional & Ethnic",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800",
    description: "Stunning Banarasi silk saree in deep crimson red and heavy golden zari borders. Worn only once for a college convocation ceremony. Absolutely clean with no threads pulled. Comes with a matching unstitched blouse piece. Dry-cleaned and stored in a saree protector bag.",
    isLong: true
  },
  {
    title: "Lucknowi Chikankari Georgette Kurta for Women",
    price: 1200,
    category: "Traditional & Ethnic",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800",
    description: "Elegant georgette chikankari hand-embroidered kurta in pastel blue color. Size M, fits beautifully. Comes with a soft inner slip.",
    isLong: false
  },
  {
    title: "Nike Air Force 1 Sneakers (White, UK 9)",
    price: 5500,
    category: "Footwear",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
    description: "Classic Nike Air Force 1 low-top sneakers in triple white colorway. Made from premium full-grain leather, super durable and highly matching with all outfits. Soles show standard light wear, star patterns are still visible. Crease protectors have been used inside to maintain structure. Regularly cleaned with premium shoe cleaner. Comes in the original orange Nike box.",
    isLong: true
  },
  {
    title: "Unisex Denim Varsity Bomber Jacket (M)",
    price: 1400,
    category: "Casual Wear",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
    description: "Cool blue denim varsity jacket with comfortable fleece sleeves and snap button closures. Cozy and stylish for autumn campus walks.",
    isLong: false
  },
  {
    title: "HC Verma Concepts of Physics (Vol 1 & 2)",
    price: 400,
    category: "Textbooks",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800",
    description: "Legendary physics textbook set by Dr. HC Verma. Complete volume 1 and 2. Essential for JEE aspirants and basic physics courses. No pages are missing, bindings are tight.",
    isLong: false
  },
  {
    title: "Indian Polity by M. Laxmikanth (6th Edition)",
    price: 450,
    category: "Textbooks",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800",
    description: "Laxmikanth Indian Polity for civil services exams. Mint condition, very light highlights on chapter 3 only. Best book for political science students.",
    isLong: false
  },
  {
    title: "Cracking the Coding Interview by Gayle McDowell",
    price: 600,
    category: "Textbooks",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800",
    description: "189 programming questions and solutions book. Highly descriptive solutions explaining DSA concepts. Absolute must-have for final year campus placement prep.",
    isLong: false
  },
  {
    title: "Casio CTK-240 49-Key Portable Keyboard",
    price: 4200,
    category: "Musical Instruments",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1552422535-c45813c61732?w=800",
    description: "Casio electronic learning keyboard with 49 standard keys, 100 tones, and 100 rhythms. Lightweight and runs on double-A batteries or power adapter (included). Perfect for learning basic scales.",
    isLong: false
  },
  {
    title: "Foldable Single Bed metal Cot Frame",
    price: 2200,
    category: "Furniture",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800",
    description: "Strong iron pipe folding bed frame. Highly portable and space saving. Fits a single coir mattress perfectly. Great for temporary hostel rooms or balcony lounging.",
    isLong: false
  },
  {
    title: "Prestige 1.5L Cordless Electric Kettle",
    price: 600,
    category: "Appliances",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800",
    description: "Prestige electric kettle with auto lock-off and dry boiling protection. Boils water in under 2 minutes. Sleek stainless steel body.",
    isLong: false
  },
  {
    title: "Premium Leather Bean Bag with Beans (XL)",
    price: 1500,
    category: "Furniture",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800",
    description: "Highly comfortable tan leather bean bag with handle. Filled with high density EPS beans. Perfect addition for relaxed gaming or reading corner.",
    isLong: false
  },
  {
    title: "Lucid 2-inch Lavender Memory Foam Topper",
    price: 2400,
    category: "Hostel Essentials",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
    description: "Soft memory foam mattress topper infused with calming lavender scent. Adds premium comfort to hard wooden hostel beds. Mint condition.",
    isLong: false
  },
  {
    title: "Fastrack Casual Analog Watch for Men",
    price: 1100,
    category: "Accessories",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800",
    description: "Fastrack analog wrist watch with bold sport dial, mineral glass lens, and comfortable black silicone strap. Water-resistant up to 50 meters.",
    isLong: false
  },
  {
    title: "Kipsta Basketball Ring with Net (Full Size)",
    price: 1300,
    category: "Sports Equipment",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800",
    description: "Official 45cm diameter basketball ring with weather-resistant nylon net. Can be mounted on any wooden board or wall for backyard basketball. Sturdy carbon steel ring.",
    isLong: false
  },
  {
    title: "Faber-Castell 48 Artist Watercolor Pencils",
    price: 900,
    category: "Art Supplies",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800",
    description: "Premium watercolor pencils set of 48 colors in a metal tin case. Soft lead and high water solubility. Ideal for painting and blended sketching.",
    isLong: false
  },
  {
    title: "Adjustable Wooden Art Easel Stand",
    price: 1200,
    category: "Art Supplies",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800",
    description: "Premium quality solid pine wood tripod easel stand with adjustable canvas heights. Holds canvas boards up to 30 inches. Folds flat for compact storage.",
    isLong: false
  },
  {
    title: "Campus Cycle Front Plastic Basket (Red)",
    price: 250,
    category: "Bicycles",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=800",
    description: "Heavy duty plastic cycle basket with rust-proof metal brackets. Easily mounts on any standard bicycle front handle to carry notebooks or groceries.",
    isLong: false
  },
  {
    title: "Steel Mesh Desk Organizer (3-Tier Tray)",
    price: 450,
    category: "Organizers",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800",
    description: "Sturdy metal wire mesh desk shelf with 3 sliding document trays. Perfect for keeping exams notes, assignments, and files perfectly cataloged.",
    isLong: false
  },
  {
    title: "Unisex Cotton oversized graphic Hoodie (L)",
    price: 1200,
    category: "Winter Wear",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800",
    description: "Heavyweight pure cotton graphic hoodie in sage green color. Oversized streetwear drop-shoulder fit, extremely cozy for cool winter evenings.",
    isLong: false
  }
];

const PUBLIC_SERVICES = [
  {
    title: "Mathematics & Calculus Home Tuition (Grade 8-12)",
    price: 300,
    priceUnit: "per hour",
    category: "Tutoring",
    availability: "🗓️ Flexible",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
    description: "Highly experienced tutor offering personalized, engaging, and result-oriented home tuition for mathematics, algebra, trigonometry, and calculus. Ideal for high school students preparing for board exams or competitive university entrance tests. I break down highly complex mathematical proofs into super easy-to-grasp logical steps, offering customized exercises and weekly tests to build deep confidence. Will travel to any area in Vadodara or take online sessions via Zoom/GMeet."
  },
  {
    title: "Web Development Bootcamp Mentoring (React, Node)",
    price: 450,
    priceUnit: "per hour",
    category: "Academic Mentoring",
    availability: "🌙 Evening",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800",
    description: "I will mentor you to build industry-grade full-stack web applications. Learn HTML, CSS, JavaScript, React.js, Node.js, Express, and MongoDB. Includes guidance on building capstone projects and standard coding practices."
  },
  {
    title: "English Spoken & IELTS Exam Prep Coaching",
    price: 350,
    priceUnit: "per hour",
    category: "Tutoring",
    availability: "🗓️ Flexible",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800",
    description: "Professional coaching for IELTS, TOEFL, and general English fluency. Intensive practice on speaking, listening, reading, and writing modules with real mockup materials."
  },
  {
    title: "Pre-Wedding & Outdoor Portrait Shoots in Vadodara",
    price: 3500,
    priceUnit: "per day",
    category: "Photography",
    availability: "🏠 Weekends",
    image: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800",
    description: "Get stunning professional pre-wedding, couple portraits, family shoots, and cinematic outdoor videos. Shot with state-of-the-art Sony Alpha mirrorless cameras and high-aperture lenses. Includes complete color-graded high-resolution digital deliveries within 5 days."
  },
  {
    title: "Professional Product Photography for Local Shops",
    price: 2500,
    priceUnit: "per project",
    category: "Photography",
    availability: "☀️ Daytime",
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800",
    description: "Boost your online sales with clean, professional, and crisp white-background studio shots of your products. Perfect for Amazon, Flipkart, or Instagram."
  },
  {
    title: "Laptop OS Installation & Formatting Service",
    price: 500,
    priceUnit: "per session",
    category: "Tech Support",
    availability: "🗓️ Flexible",
    image: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800",
    description: "Get your laptop formatted and fully updated. Installation of official Windows 10/11, standard drivers, security patches, and crucial engineering software. Cleanup of junk files."
  },
  {
    title: "Desktop PC Assembly & Component Deep Cleaning",
    price: 800,
    priceUnit: "per session",
    category: "Device Repair",
    availability: "🏠 Weekends",
    image: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800",
    description: "Professional custom PC assembly from individual parts. Deep hardware cleaning, dust removal using blower, and high-quality thermal paste replacement to lower temperatures."
  },
  {
    title: "Vadodara Local House Shifting & Relocation Help",
    price: 2500,
    priceUnit: "per project",
    category: "Moving Assistance",
    availability: "🏠 Weekends",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    description: "Stress-free local home shifting service. We provide loading/unloading support, secure bubble wrapping for glass items, and sturdy cartoon boxes for luggage transfer."
  },
  {
    title: "Intercity Bike transportation Cargo Packaging",
    price: 1200,
    priceUnit: "per project",
    category: "Packing Services",
    availability: "☀️ Daytime",
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800",
    description: "Highly secure double-layer bubble wrapping and cardboard packaging of your motorcycle/scooter for safe train cargo or courier transport."
  },
  {
    title: "Professional UI/UX Figma App Design",
    price: 500,
    priceUnit: "per hour",
    category: "Graphic Design",
    availability: "🗓️ Flexible",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    description: "Custom UI/UX designs, wireframes, and fully interactive high-fidelity prototypes in Figma for your web or mobile application ideas."
  },
  {
    title: "YouTube Video Editing & Slick Reels Cut",
    price: 400,
    priceUnit: "per hour",
    category: "Video Editing",
    availability: "🌙 Evening",
    image: "https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=800",
    description: "Professional dynamic video editing in Premiere Pro and After Effects. Renders slick cuts, sound effects, trending captions, and neat transitions for Reels and YouTube."
  },
  {
    title: "Deep Flat & Apartment cleaning Service",
    price: 1500,
    priceUnit: "per session",
    category: "Room Cleaning",
    availability: "🏠 Weekends",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
    description: "Complete deep cleaning of 1BHK/2BHK flats in Vadodara. Includes bathroom descaling, kitchen cabinet scrubbing, window channel dusting, floor sanitization, and cobweb removal."
  },
  {
    title: "Personal Gym Trainer & Diet Nutrition Plan",
    price: 1200,
    priceUnit: "per session",
    category: "Fitness Coaching",
    availability: "🌙 Evening",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",
    description: "Certified fitness trainer offering customized workout routines (weight loss, muscle gain) and easy-to-follow healthy macro diet consultation."
  },
  {
    title: "Weekend Car Ride Sharing: Vadodara to Ahmedabad",
    price: 400,
    priceUnit: "per session",
    category: "Carpooling & Rides",
    availability: "🗓️ Flexible",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
    description: "Commute in a clean, fully air-conditioned sedan from Vadodara to Ahmedabad every Friday evening. Split petrol costs cleanly. Space for one small luggage bag per person."
  }
];

module.exports = {
  PUBLIC_PRODUCTS,
  PUBLIC_SERVICES
};
