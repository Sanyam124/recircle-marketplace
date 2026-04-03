'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const subscriptionRef = useRef<PushSubscription | null>(null);

  useEffect(() => {
    subscriptionRef.current = subscription;
  }, [subscription]);

  // On mount: check if we already have a subscription
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscription(sub);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Sync subscription with backend when user logs in
  useEffect(() => {
    if (user && subscriptionRef.current) {
      fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscriptionRef.current })
      }).catch(() => {});
    }
  }, [user]);

  const subscribeToPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications require HTTPS or localhost.\n\nOn mobile over local WiFi (HTTP), push notifications are blocked by the browser. They will work once deployed to a real HTTPS domain.\n\nOn desktop, use http://localhost:3000');
      return;
    }

    try {
      // Step 1: Ask permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied.\n\nClick the lock icon in the address bar → Site settings → Notifications → Allow');
        return;
      }

      // Helper function to safely wait for activation
      const ensureActiveSW = async (): Promise<ServiceWorkerRegistration> => {
          let reg = await navigator.serviceWorker.getRegistration();
          if (!reg) {
              reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          }
          
          if (reg.active) return reg;

          return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
              const worker = reg?.installing || reg?.waiting;
              if (!worker) {
                  navigator.serviceWorker.ready.then(resolve).catch(reject);
                  setTimeout(() => reject(new Error('Timed out waiting for SW to be ready natively.')), 8000);
                  return;
              }
              
              if (worker.state === 'activated') return resolve(reg as ServiceWorkerRegistration);
              
              worker.addEventListener('statechange', () => {
                  if (worker.state === 'activated') resolve(reg as ServiceWorkerRegistration);
                  else if (worker.state === 'redundant') reject(new Error('Service worker failed to install (became redundant). This usually means a typo in sw.js or a 404 resource.'));
              });
              
              // Failsafe timeout
              setTimeout(() => reject(new Error('Service worker statechange timed out.')), 8000);
          });
      };

      // Step 2: Ensure an ACTIVE Service Worker
      let registration: ServiceWorkerRegistration | null = null;
      try {
        registration = await ensureActiveSW();
      } catch (e: any) {
        // Auto-heal: Unregister and completely fresh install
        console.warn('SW issue detected:', e.message, 'Forcing unregister and retry...');
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
        
        const freshReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (freshReg.active) {
            registration = freshReg;
        } else {
            // Need to wait it out again
            registration = await new Promise<ServiceWorkerRegistration>((res, rej) => {
                const w = freshReg.installing || freshReg.waiting;
                if (!w) {
                    navigator.serviceWorker.ready.then(res).catch(rej);
                    return;
                }
                w.addEventListener('statechange', () => {
                   if (w.state === 'activated') res(freshReg);
                   if (w.state === 'redundant') rej(new Error('Failed to install SW even after force reset'));
                });
            });
        }
      }

      if (!registration || !registration.active) {
         alert('Browser failed to activate the Service Worker. Please press Ctrl+Shift+R to hard refresh.');
         return;
      }

      // Step 3: Subscribe
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        alert('VAPID key is missing. Please rebuild the app.');
        return;
      }

      let sub = null;
      try {
        // Unsubscribe from any old subscription first (VAPID keys may have changed)
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }

        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
      } catch (subErr: any) {
        // Fallback: If pushManager fails, it might be heavily stuck, force unregister and retry exactly once
        console.warn('Push subscription failed, forcing clean SW install...', subErr);
        await registration.unregister();
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
      }

      if (!sub) throw new Error('No subscription returned from browser');



      setSubscription(sub);

      // Step 4: Save to server
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub })
      });

      if (!res.ok) throw new Error('Server failed to save subscription');

      alert('✅ Desktop notifications enabled!');

    } catch (err: any) {
      console.error('Push subscription failed:', err);
      alert('Notification Error: ' + (err.message || 'Unknown error'));
    }
  }, []);

  const unsubscribeFromPush = useCallback(async () => {
    try {
      if (subscriptionRef.current) {
        await subscriptionRef.current.unsubscribe();
        setSubscription(null);
        await fetch('/api/notifications/subscribe', { method: 'DELETE' });
        alert('Desktop notifications disabled.');
      }
    } catch (err: any) {
      console.error('Unsubscribe failed:', err);
    }
  }, []);

  // Expose to window for NotificationBell
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).subscribeToPush = subscribeToPush;
      (window as any).unsubscribeFromPush = unsubscribeFromPush;
      (window as any).pushSubscription = subscription;
    }
  }, [subscribeToPush, unsubscribeFromPush, subscription]);

  return null;
}
