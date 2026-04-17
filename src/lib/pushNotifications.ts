import webpush from 'web-push';
import User from '@/models/User';

let vapidKeysSet = false;
function setVapid() {
  if (vapidKeysSet) return;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@recircle.info';
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidKeysSet = true;
  }
}

export type NotificationType = 'message' | 'offer' | 'newsletter' | 'community' | 'security';

export async function sendPushNotification(userId: string, payload: { title: string, body: string, icon?: string, data?: any }, type: NotificationType = 'message') {
  try {
    setVapid();
    const user = await User.findById(userId).select('pushSubscription notifyOffers notifyMessages notifyNewsletter notifyCommunity notifySecurity');
    if (!user || !user.pushSubscription) return;

    // Check preferences (Fallback to true if undefined/missing in DB)
    const canNotifyMessages = user.notifyMessages !== false;
    const canNotifyOffers = user.notifyOffers !== false;
    const canNotifyNewsletter = user.notifyNewsletter !== false;
    const canNotifyCommunity = user.notifyCommunity !== false;
    const canNotifySecurity = user.notifySecurity !== false;

    if (type === 'message' && !canNotifyMessages) return;
    if (type === 'offer' && !canNotifyOffers) return;
    if (type === 'newsletter' && !canNotifyNewsletter) return;
    if (type === 'community' && !canNotifyCommunity) return;
    if (type === 'security' && !canNotifySecurity) return;

    const subscription = JSON.parse(user.pushSubscription);
    
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    
    // console.log('Push sent to', userId);
  } catch (err: any) {
    if (err.statusCode === 410) {
      // Subscription has expired or is no longer valid, remove it
      await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: "" } });
    } else {
      console.error('Push send failed:', err.message);
    }
  }
}
