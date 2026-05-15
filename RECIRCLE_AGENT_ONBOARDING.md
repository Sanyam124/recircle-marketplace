# ⭕ ReCircle Marketplace — Master Agent Onboarding Specification

This document serves as the absolute source of truth for the **ReCircle Marketplace** architecture, tech stack, database schemas, feature specifications, and implementation rules. Provide this context directly to any AI agent or developer to guarantee rapid, context-aware assistance without breaking established patterns.

---

## 🏛️ 1. High-Level Vision & Core Identity
**ReCircle** is a hyper-local, peer-to-peer (P2P) campus ecosystem designed exclusively for university students. It combines the dynamics of a digital classifieds platform with deep social integration to enable sustainable living (circular economy) within college boundaries.

### **Core Differentiators:**
* **Trust & Safety First:** Access to internal campus feeds is restricted using verified `.edu` or specific college institutional email domains.
* **Unified Feed Architecture:** Seamlessly merges physical **Products** (Buy/Rent) and peer **Services** (Freelance tasks, local repairs) into continuous discovery interfaces.
* **Hyper-Local Targeting:** Listings filter dynamically down to specific university chapters, and even further into distinct **Hostel / Building blocks** to facilitate instant, zero-shipping, hand-to-hand transactions.
* **Circle Notice Boards:** Dedicated community broadcast feeds for local alerts, event signups, lost & found, and group polls.

---

## 🛠️ 2. Technology Stack
* **Core Framework:** Next.js 15 (App Router, Server Actions, API Routes)
* **Language:** TypeScript (Strict Mode enforced)
* **Frontend Library:** React 19
* **Styling:** Tailwind CSS (Rich dark mode support, glassmorphism overlays, multi-column high-density grids)
* **Database:** MongoDB configured with Mongoose ODM (utilizing complex aggregation pipelines)
* **Asset Storage:** Cloudinary (secure cloud CDN for user avatars, custom profile banners, and listing imagery)
* **Authentication:** NextAuth / Secure HttpOnly JWT session tokens
* **Mapping / Geospatial:** Leaflet interactive maps with dynamic client import blocks
* **Deployment Infrastructure:** Vercel (`recircle-hub.vercel.app`)

---

## 🗄️ 3. Database Schemas & Core Models

### **1. User (`src/models/User.ts`)**
Tracks authentications, roles, verified institutional mapping, and personalized wishlists.
* **Key Fields:** `username`, `email`, `role` (`'user'` | `'verifier'` | `'admin'`), `verifiedCommunities` (Array of ObjectId references to authorized Campuses), `wishlistedProducts`, `wishlistedServices`, `defaultCommunity`, `defaultHostel`.

### **2. Community (`src/models/Community.ts`)**
Defines valid campus entities, target verification domains, active status flags, and embedded hostels.
* **Key Fields:** `name`, `domain` (e.g., `'college.edu'`), `hostels` (Array of Strings representing valid building areas), `location.coordinates` (GeoJSON Point), `isActive`.

### **3. Product (`src/models/Product.ts`)**
Represents physical items configured for direct purchase or recurring lease.
* **Key Fields:** `title`, `description`, `price`, `images`, `category`, `condition` (`'New'` | `'Like New'` | `'Good'` | `'Fair'`), `forSell` (Boolean), `forRent` (Boolean), `rentPrice`, `rentUnit`, `community`, `visibility` (`'Public'` | `'Community'`), `location` (embedded Sub-document referencing exact hostel/bed metrics).

### **4. Service (`src/models/Service.ts`)**
Represents human skills and time-based peer offerings.
* **Key Fields:** `title`, `description`, `price`, `priceUnit` (`'per hour'` | `'per task'` | `'fixed'`), `availability` (`'🗓️ Flexible'` | `'🏠 Weekends'` | `'🌙 Evening'` | `'☀️ Daytime'`), `provider` (Ref to User), `community`, `visibility`.

### **5. BoardPost (`src/models/BoardPost.ts`)**
Stores community bulletin threads and interactive social items.
* **Key Fields:** `author`, `community`, `content`, `category` (`'General'` | `'LostFound'` | `'Essentials'` | `'Events'` | `'Alerts'`), `upvotes` (Array of ObjectIds), `downvotes`, `replies` (Embedded Sub-document array).

---

## ⚙️ 4. Key Architectural Subsystems

### **A. Unified Explore Pipeline (`src/app/api/explore/route.ts`)**
The discovery core leverages advanced MongoDB aggregation pipelines to serve high-performance querying:
* **The `$unionWith` Pattern:** Merges documents from the `products` collection and `services` collection into a unified feed dynamically when browsing `type === 'all'`.
* **Full-Text Token Indexer:** Strips English stop words and creates optimized parallel case-insensitive regex searches across `title`, `description`, and `category`.
* **State Persistence:** Frontend filters (`search`, `sort`, `categories`, `conditions`, `availabilities`, `hostel`) sync instantaneously to the browser's URL search parameters using `router.push(url, { scroll: false })` to avoid jarring scroll-to-top resets.

### **B. Responsive Multi-Column Grid Design**
* **Desktop Layout:** Uses a wide persistent sticky sidebar (`ExploreSidebar.tsx`) combined with a dynamic 5-column item catalog grid for maximized visual data density.
* **Mobile Drawer:** Employs an immersive popup overlay wrapper anchored via `top-16` and `bottom-[80px]` boundaries at `z-[250]`. This ensures the **Apply / Reset** toolbar remains pinned above bottom nav overlays without clipping or requiring dual scrollbars.

### **C. Anti-Spam & Write Integrity Guards**
* **Rate-Limiting System (`src/lib/rate-limit.ts`):** Enforces strict sliding-window thresholds per user identifier to block board spam, rapid API polling, and unverified scraping attempts.
* **Atomic Operations:** Upvotes, downvotes, and wishlists use transactional array methods (`$push`, `$pull`, `.splice`) with mutual exclusion logic.

---

## 🚨 5. Golden Rules for Future Agents & Developers

When modifying or adding features to this codebase, **strictly adhere to the following directives**:

1. **Routing State preservation:** Always append `{ scroll: false }` when calling `router.push` inside filter updates to ensure users do not lose their current vertical scroll position.
2. **Dynamic Client Component Isolation:** Wrap all map views, rich text renderers, or window-dependent modules using Next.js `dynamic(() => import(...), { ssr: false })` to guarantee static compilation (`tsc`/`build`) integrity.
3. **Array Param Serialization:** When transmitting multiple filters over HTTP GET strings, serialize them using bracket array notation (`param.append('availabilities[]', value)`), and extract them securely via `searchParams.getAll()`.
4. **Emoji Text Integration:** Avoid setting `line-clamp` rules on short tags containing icons or emojis (e.g., availability indicators) to prevent unexpected layout ellipsis wrapping (`...`). Use `flex items-center whitespace-nowrap` instead.
5. **No Placeholders:** If implementing UI components, never leave unfinished mock components or broken links. Maintain rich hover styles (`hover:-translate-y-1`, smooth transitions) to uphold a premium user experience.

---
*Generated for system state continuation. Ready for deployment and feature extension.*
