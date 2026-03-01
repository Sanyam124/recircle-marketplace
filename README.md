# ReCircle Marketplace 🔄

**ReCircle** is a modern, secure, and student-centric community marketplace designed to facilitate the trading of essentials and the offering of freelance services within campus ecosystems.

![ReCircle Logo](/public/logo.png)

## 🚀 Vision
Empowering students to build a sustainable and collaborative economy by providing a trusted platform to buy, sell, and schedule services with ease.

## ✨ Core Features

### 🛒 Product Marketplace
- **List & Discover**: Easily post items for sale with image uploads (Cloudinary integration).
- **Secure Transactions**: OTP-verified handoffs to ensure both parties are satisfied before completion.
- **Dynamic Search**: Filter products by category, price range, and condition.

### 🛠️ Service Appointments
- **Freelance Hub**: Offer or book services like tutoring, repairs, or creative work.
- **Smart Scheduling**: Integrated appointment request and acceptance flow.
- **Repeatable Services**: Unlike products, services remain available for multiple bookings.

### 💬 Intelligent Chat System
- **Real-time Negotiation**: Direct messaging between buyers and sellers.
- **Tabbed Interface**: Switch seamlessly between conversation and action (Make Offer / Request Appointment).
- **Price Guardrails**: Automatic validation (±200% price caps, integer-only pricing) to keep deals fair.
- **System Automation**: Automated messages for order confirmations and cancellations.

### 🛡️ Trust & Security
- **Identity Verification**: Strict name/username constraints and Google OAuth integration.
- **Atomic Operations**: Backend logic powered by MongoDB atomic transitions to prevent race conditions.
- **Dispute Resolution**: Dedicated admin tools to resolve issues and refund buyers.

## 🛠️ Tech Stack
- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), React 19, Tailwind CSS.
- **Backend**: Next.js API Routes, Node.js.
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/).
- **Auth**: JWT-based authentication & Google OAuth.
- **Storage**: [Cloudinary](https://cloudinary.com/) for optimized image hosting.

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or local instance.
- Cloudinary account.

### Installation
1. **Clone the Repo**:
   ```bash
   git clone https://github.com/Sanyam124/Minor-Project-Dev.git
   cd recircle-marketplace
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_id
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Seed Data (Optional)**:
   ```bash
   npm run seed
   ```

## 📜 License
This project is developed as part of a student minor project. All rights reserved.

---
*Built with ❤️ for the student community.*
