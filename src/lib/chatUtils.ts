/**
 * chatUtils.ts
 *
 * Business logic utilities used by the chat feature.
 * Extracted here from ChatItem.tsx to keep the UI component clean
 * and to make this logic independently testable.
 */

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

/** Status information returned to the ChatItem to render a status badge. */
export interface ChatStatusInfo {
    /** The label to display (e.g. 'SOLD', 'ACTIVE'). Null means show last message instead. */
    label: string | null;
    /** Whether this is a structured status badge (true) or plain last-message text (false). */
    isStatus: boolean;
    /** Tailwind color class string for the badge text/border color. */
    color?: string;
    /** Optional price prefix label (e.g. 'OFFER ₹1,200' or 'APPO. ₹500'). */
    priceLabel?: string | null;
}

// ─────────────────────────────────────────────────────────────
//  Main Utility
// ─────────────────────────────────────────────────────────────

/**
 * Determines what status badge to show in a chat list item.
 *
 * Priority order:
 *  1. Cancellation (most recent wins between order and offer)
 *  2. Product statuses (Sold → Bought/Sold/Unavailable; Offer status)
 *  3. Service statuses (Active order > offer, Completed, fall back to offer)
 *  4. No status → show last message text as fallback
 *
 * @param conv        - The conversation object from the API
 * @param currentUserId - The ID of the currently authenticated user
 * @returns ChatStatusInfo used to render the badge in ChatItem
 */
export function getConversationStatus(conv: any, currentUserId: string | undefined): ChatStatusInfo {
    // No user logged in — just show last message text
    if (!currentUserId) {
        return { label: conv.lastMessage.content, isStatus: false };
    }

    const product = conv.product;
    const service = conv.service;
    const buyerId = conv.buyerId?.toString();

    // Timestamps for tie-breaking between order and offer events
    const orderTime = conv.orderUpdatedAt ? new Date(conv.orderUpdatedAt).getTime() : 0;
    const offerTime = conv.latestOffer  ? new Date(conv.latestOffer.updatedAt).getTime() : 0;

    // ── Priority 0: Cancellation ───────────────────────────────
    // If the order was cancelled and it's more recent than the last offer, show CANCELLED.
    if (conv.orderStatus === 'Cancelled' && orderTime >= offerTime) {
        const prefix = service ? 'APPO.' : 'OFFER';
        const price  = conv.latestOffer?.offeredPrice?.toLocaleString();
        return {
            label:      'CANCELLED',
            isStatus:   true,
            color:      'text-red-500 dark:text-red-400',
            priceLabel: price ? `${prefix} ₹${price}` : null,
        };
    }

    // ── Priority 1: Product statuses ──────────────────────────
    if (product) {
        const sellerId = product.seller?.toString() || product.seller?._id?.toString();

        if (product.status === 'Sold' || product.status === 'Rented') {
            const isRented = product.status === 'Rented';
            const price = conv.latestOffer?.offeredPrice?.toLocaleString();
            const color = isRented ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400';
            const statusLabel = isRented ? 'RENTED' : 'SOLD';

            // Current user was the buyer/renter
            if (currentUserId === buyerId) {
                return { 
                    label: isRented ? 'RENTED' : 'BOUGHT', 
                    isStatus: true, 
                    color: isRented ? 'text-emerald-600 dark:text-emerald-400' : 'text-green-600 dark:text-green-400', 
                    priceLabel: price ? `OFFER ₹${price}` : null 
                };
            }
            // Current user was the seller/owner
            if (currentUserId === sellerId) {
                // The other person in this chat was the actual buyer/renter
                if (conv.user && (conv.user._id || conv.user.id)?.toString() === buyerId) {
                    return { 
                        label: isRented ? 'RENTED OUT' : 'SOLD', 
                        isStatus: true, 
                        color, 
                        priceLabel: price ? `OFFER ₹${price}` : null 
                    };
                }
                // The product was sold/rented to someone else
                return { 
                    label: `${statusLabel} TO OTHER USER`, 
                    isStatus: true, 
                    color: 'text-gray-500 font-medium italic' 
                };
            }
            return { 
                label: isRented ? 'CURRENTLY RENTED' : 'UNAVAILABLE NOW', 
                isStatus: true, 
                color: isRented ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400' 
            };
        }

        // Product is still available — show active offer negotiation status
        if (conv.latestOffer) {
            const price  = conv.latestOffer.offeredPrice.toLocaleString();
            const status = conv.latestOffer.status;
            let label: string | null = null;
            let color = 'text-green-600 dark:text-green-400';

            if (status === 'Accepted') { label = 'AGREED'; }
            else if (status === 'Declined') { label = 'REJECTED'; color = 'text-red-500 dark:text-red-400'; }

            return { label, isStatus: true, color, priceLabel: `OFFER ₹${price}` };
        }
    }

    // ── Priority 2: Service statuses (repeatable bookings) ────
    if (service) {
        const price = conv.latestOffer?.offeredPrice?.toLocaleString();

        // Active orders take priority over offer status when they are more recent
        if (conv.orderStatus && orderTime >= offerTime) {
            const activeStatuses = ['Scheduled'];

            if (activeStatuses.includes(conv.orderStatus)) {
                return { label: 'ACTIVE', isStatus: true, color: 'text-indigo-600 dark:text-indigo-400', priceLabel: price ? `APPO. ₹${price}` : null };
            }
            if (conv.orderStatus === 'Completed') {
                return { label: 'COMPLETED', isStatus: true, color: 'text-green-600 dark:text-green-400', priceLabel: price ? `APPO. ₹${price}` : null };
            }
        }

        // Fall back to the offer status (e.g. appointment was accepted but order not yet progressed)
        if (conv.latestOffer) {
            const status = conv.latestOffer.status;
            let label: string | null = null;
            let color = 'text-green-600 dark:text-green-400';

            if (status === 'Accepted') { label = 'ACTIVE'; }
            else if (status === 'Declined') { label = 'REJECTED'; color = 'text-red-500 dark:text-red-400'; }

            return { label, isStatus: true, color, priceLabel: price ? `APPO. ₹${price}` : null };
        }
    }

    // ── Fallback: No actionable status — show last message ────
    return { label: conv.lastMessage.content, isStatus: false };
}
