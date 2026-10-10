# ReCircle 🔄

> **A Hyper-Local, Peer-to-Peer Campus Marketplace & Service Exchange Platform**

ReCircle is a full-stack campus ecosystem built for university students to buy, sell, rent, and schedule peer services safely within their verified institutional boundaries. By combining geospatial hostel-level filtering, real-time negotiation chat, two-step OTP handshake transactions, and decentralized community verification, ReCircle powers a trusted circular economy on college campuses.

---

## 🌟 Key Highlights & Engineering Features

### 📍 1. Hyper-Local Hostel & Campus Scoping
* **Geospatial Discovery**: Integrates dynamic interactive maps (Leaflet) allowing buyers to locate items within specific university zones.
* **Hostel & Block Filtering**: Listings can be scoped down to specific residential blocks and hostels, enabling 5-minute hand-to-hand delivery with zero shipping costs.

### 💬 2. Real-Time WebSocket Negotiation & Chat
* **Live In-Chat Offers**: Powered by **Pusher WebSockets**, buyers can submit counter-offers with real-time UI synchronization without page refreshes.
* **Product-Contextual Messaging**: Conversations maintain active listing snapshots, auto-updating deal status upon agreement.
* **Web Push Notifications**: Service Worker VAPID push notifications alert users of unread messages and order status changes even when the browser is closed.

### 🤝 3. Two-Step OTP Handshake Verification Protocol
* **Zero Fraud Handoff**: For in-person item exchanges, the seller generates a unique cryptographically random OTP; the order completes atomically only after the buyer inspects the item and confirms the OTP.
* **Double-Sided Reviews**: Upon successful order completion, both buyer and seller leave bidirectional verified reviews and reputation ratings.

### 🛡️ 4. Multi-Role Institutional Governance (RBAC)
* **Students**: Browse, buy, list products/services, post on community notice boards, negotiate via chat.
* **Campus Verifiers**: Dedicated verification dashboard (`/verifier-dashboard`) allowing appointed student leaders to inspect student IDs and approve institutional badges.
* **System Administrators**: Full administrative portal (`/admin`) for platform metrics, dispute resolution, automated audit logs, user bans, and dynamic site-wide limit controls.

### 📢 5. Campus Circle Notice Board
* Hyper-local community bulletin board for campus announcements, event sign-ups, lost & found notices, and peer polling with real-time upvoting.

### ⚡ 6. Production Engineering & Resilience
* **Multi-Tier SMTP Failover Engine**: Resilient automated email routing configured with primary (Gmail SMTP), secondary (Brevo SMTP), and tertiary (Resend API) automatic failovers.
* **Sliding Window Rate Limiting**: In-memory and database-backed rate limiters prevent API abuse, spam, and brute-force attacks on authentication routes.
* **Atomic Deletion Cascades & Cloudinary GC**: Background cron jobs (`/api/cron/cleanup`) garbage-collect orphaned media assets and expired listings.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | **Next.js 15** (App Router), **React 19**, **TypeScript** (Strict Mode) |
| **Styling & UI** | **Tailwind CSS**, Glassmorphism UI tokens, Responsive Mobile-First Grids |
| **Database & ODM** | **MongoDB Atlas**, **Mongoose** (Aggregation pipelines, transactional updates) |
| **Real-Time & Sockets** | **Pusher Channels (WebSockets)**, Web Push Notifications (VAPID) |
| **Authentication** | **NextAuth.js**, Secure HttpOnly Cookie JWT sessions, `bcryptjs` password hashing |
| **Media & CDN** | **Cloudinary** (Secure image uploads, auto-compression, CDN delivery) |
| **Mapping** | **Leaflet**, OpenStreetMap geospatial coordinates |
| **Payment & Mail** | **Razorpay** SDK, **Nodemailer**, **Brevo**, **Resend** |
| **Deployment** | **Vercel** (`recircle-marketplace`) |

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   Next.js 15 Frontend  │
                                  │ (React 19 / Tailwind)  │
                                  └───────────┬────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     │ REST API / Route Handlers                       │ WebSockets
                     ▼                                                 ▼
        ┌─────────────────────────┐                        ┌──────────────────────┐
        │     Node.js Server      │                        │    Pusher Engine     │
        │  (Next.js App Router)   │                        │ (Live Chat & Offers) │
        └────────────┬────────────┘                        └──────────────────────┘
                     │
       ┌─────────────┴─────────────┬──────────────────────────┐
       ▼                           ▼                          ▼
┌──────────────┐          ┌────────────────┐         ┌─────────────────┐
│   MongoDB    │          │   Cloudinary   │         │  SMTP Services  │
│    Atlas     │          │  Asset Hosting │         │(Gmail/Brevo/Res)│
└──────────────┘          └────────────────┘         └─────────────────┘
```

---

## 🚀 Getting Started Locally

### Prerequisites
* **Node.js**: v18.18 or higher
* **npm** or **pnpm**
* **MongoDB**: A running local instance or MongoDB Atlas URI

### 1. Clone the Repository
```bash
git clone https://github.com/Sanyam124/Minor-Project-Dev.git
cd Minor-Project-Dev
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/recircle

# Authentication
JWT_SECRET=your_super_secret_jwt_key

# Cloudinary (Image Hosting)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Pusher WebSockets (Live Chat)
PUSHER_APP_ID=your_pusher_app_id
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=ap2

# Email Delivery (Optional for local testing)
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore the platform.

---

## 🗄️ Core Database Models

* **`User`**: Profiles, institutional verifications, roles (`user`, `verifier`, `admin`), ratings, wishlist.
* **`Community`**: Institutional campus entities, allowed email domains, hostels, coordinates.
* **`Product`**: Physical listings with buy/rent pricing, hostel location subdocuments, category tags.
* **`Service`**: Peer freelance offerings, hourly/task pricing, availability schedules.
* **`Order`**: Transaction states, 2-step OTP codes, payment records, double-sided ratings.
* **`Message`**: Real-time conversation threads with contextual offers and appointment requests.
* **`BoardPost`**: Community circulars, announcements, and upvotes.
* **`VerificationRequest`**: Student ID submissions for campus verifier review.

---

## 🔒 Security & Privacy Practices

* **HTTP-Only Cookies**: Prevents client-side XSS access to authentication tokens.
* **Input Sanitization & Schema Validation**: Strict regex constraints for usernames, emails, and prices.
* **Strict Role-Based Middleware**: Route protection guards (`src/middleware.ts`) preventing unauthorized access to administrative queues.
* **Secure Environment Secret Isolation**: All sensitive infrastructure keys are excluded from git history.

---

## 📄 License
This project is developed as an academic and community initiative. All rights reserved.
