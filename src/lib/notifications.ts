import Notification from '@/models/Notification';
import { sendPushNotification } from './pushNotifications';

interface NotificationOptions {
  recipient: string;
  sender?: string;
  type: 'ORDER_PLACED' | 'SERVICE_REQUEST' | 'DELIVERY_UPDATE' | 'ORDER_UPDATE' | 'ADMIN_ALERT' | 'CHAT_MESSAGE' | 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'OFFER_DECLINED' | 'VERIFICATION_UPDATE';
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(options: NotificationOptions) {
  try {
    // For Chat Messages, we want to update the existing unread notification if it exists to avoid spam
    if (options.type === 'CHAT_MESSAGE') {
      const existing = await Notification.findOne({
        recipient: options.recipient,
        sender: options.sender,
        type: 'CHAT_MESSAGE',
        isRead: false
      });

      if (existing) {
        existing.message = options.message;
        existing.link = options.link || existing.link;
        existing.metadata = { ...existing.metadata, ...options.metadata };
        // Update timestamp so it floats to top
        (existing as any).updatedAt = new Date();
        await existing.save();
        
        // Also trigger Push Notification for the update
        await sendPushNotification(options.recipient, {
            title: getTitleForType(options.type),
            body: options.message,
            icon: '/icon-192x192.png',
            data: {
                url: options.link || '/notifications',
                notificationId: existing._id
            }
        }, 'message');
        
        return existing;
      }
    }

    const notification = await Notification.create(options);

    // [TYPE MAPPING]
    const pushType = options.type === 'CHAT_MESSAGE' ? 'message' : 'offer';

    // Also trigger Push Notification
    await sendPushNotification(options.recipient, {
        title: getTitleForType(options.type),
        body: options.message,
        icon: '/icon-192x192.png',
        data: {
            url: options.link || '/notifications',
            notificationId: notification._id
        }
    }, pushType);

    return notification;
  } catch (error) {
    console.error('Failed to create notification or push:', error);
  }
}

function getTitleForType(type: string): string {
  switch (type) {
    case 'CHAT_MESSAGE': return 'New Message';
    case 'ORDER_PLACED':
    case 'SERVICE_REQUEST': return 'New Transaction';
    case 'OFFER_RECEIVED': return 'New Offer';
    case 'OFFER_ACCEPTED': return 'Offer Accepted';
    case 'OFFER_DECLINED': return 'Offer Declined';
    case 'ORDER_UPDATE': return 'Order Update';
    case 'DELIVERY_UPDATE': return 'Delivery Update';
    case 'VERIFICATION_UPDATE': return 'Security Update';
    default: return 'ReCircle Notification';
  }
}
