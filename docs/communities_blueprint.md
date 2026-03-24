# ReCircle Communities (Circles)

This blueprint outlines the logic and user experience for the "Circles" feature, focusing on safety, automation, and community trust.

---

## 1. The Community Structure

### Managed by Admins
Only platform administrators can officially create a "Circle."
Examples include:
- Parul University
- IIT Delhi
- X Corporate Office
- X Colony

### The Verifier Role
Admins can appoint specific trusted members within a community as "Verifiers."
Their sole responsibility is to review and approve their peers for verification within that circle.

---

## 2. Membership Types

### A. The "Guest" (Automatic Access)

**How to Join:**
Simply arrive at the physical location. The app detects your GPS location and automatically adds you as a Guest.

**Capabilities (Double-Sided Visibility):**
- **Guest Sees Community:** You can see and buy community products/services only while you are physically present in that location (2-Hour Rule).
- **Community Sees Guest:** Members of the community can see and buy your products/services only while you are physically present (2-Hour Rule).

**The 2-Hour Rule:**
If the Guest has not been detected in the community for more than 2 hours:
- Their listings are hidden from that community.
- Community listings are hidden from the Guest.

**Trust Level:**
Low trust level (No "Verified" badge).

---

### B. The "Verified Resident" (Permanent Access)

**How to Join:**

**1. Manual Verification:**
- Upload proof of residency or membership such as:
  - ID Card
  - Utility Bill
  - Aadhar Card
- A Verifier reviews and approves the request.

**2. Automatic Verification (Email Suffix):**
- If a user registers or logs in using a verified community email domain (e.g., `@paruluniversity.ac.in`).
- The user is instantly verified for that community.

**Approval Process:**
- **Automatic:** For matching email domains
- **Manual:** For ID document uploads

**Capabilities:**
- Full access to:
  - Community products/services
  - Public-marked products/services

**Privacy Benefit:**
Once verified, ReCircle stops tracking the user's GPS location. The user also receives a "Community Verified Badge" on their profile.

---

### C. Multi-Community Residents

**The Scenario:**
A user may be verified in multiple communities, for example:
- Parul University (College)
- X Colony (Home)

**The Experience:**
The **Explore Feed** will show:
- Items from all verified communities
- Items from the community the user is currently visiting as a Guest

**Flexibility:**
Users can apply for verification in multiple circles, such as:
- Work
- College
- Home

This allows permanent access to multiple trusted communities.

---

## 3. Relative Trust (Context-Sensitive Badges)

**The Problem:**
A generic "Verified" badge can be unclear.

**The Solution:**
Badges are relative and community-specific.
If you share a community with a seller, the badge will show:
`Verified at [Community Name]`

**Examples:**
- If both users belong to Parul University, the badge shows: **Verified at Parul University**
- If the same seller lists an item in X-Colony where they are not verified, the badge will *not* appear for buyers in that community.

This makes trust context-based and transparent.

---

## 4. Community Board (Notice Board)
*Social interaction layer designed for highly engaged community communication.*

**Location:**
Accessible via the "Circle Board" link in the Navbar, placed next to the "Explore" tab.

**Content:**
Short text-only posts, such as:
- "Mathematics notes"
- "Lost keys at Canteen"

**Circle Switcher:**
- If a user belongs to multiple circles (for example Home, College, or Guest location), the Board page will include a Circle Switcher Dropdown.
- This allows users to toggle between different community boards they have access to.

**Priority Display:**
The board shows the current physical Guest location first if applicable.

**Auto-Expiry:**
Posts automatically disappear after 48 hours to keep the board clean and relevant.

**Interaction Features:**
Users can:
- Upvote posts
- Quick-Reply directly from the board

---

## 5. Smart Verification Routing

**The Component:**
A Dynamic Community Search Dropdown used during verification.

**Smart Defaults:**
When the verification screen opens, the first suggested community is the one where the user is currently located based on GPS.

**Live Search:**
As the user types in the search field, the list updates instantly to help them locate their campus or office.

**Localized Routing:**
Once the community is selected, the verification request is automatically routed to the Verifiers assigned to that specific circle.

---

## 6. Manage Communities (Settings)
Users can manage their trusted circles through a dedicated Settings section.

**Add Community:**
- Displays a searchable dropdown of available communities.
- **Priority:** Shows the nearest community based on the user's current location.
- **Dynamic Search:** Results update as the user types.
- **Confirmation Message:** *"Are you sure you want to add [Community Name]?"*

**Remove Community:**
- Displays a list of the user's currently verified communities.
- **Confirmation Message:** *"Are you sure you want to remove your verification for [Community Name]?"*

---

## 7. Verifier Controls

**Decision Authority:**
Verifiers review manual verification requests and choose one of the following actions:

**Approve:**
- Grants the Verified Badge
- Sends an Approval Email to the requester

**Reject:**
- Declines the verification request
- Sends a Rejection Email explaining the decision

---

## 8. Why This Makes ReCircle Unique

**Zero-Tracking Privacy:**
Unlike many apps that track users continuously, ReCircle stops tracking location once verification is completed.

**Human-to-Human Trust:**
Verification is handled by real people within the same community, not automated AI systems.

**The "Campus Bubble":**
ReCircle creates a trusted digital environment where students and members can trade safely without worrying about external scammers or unknown users.
