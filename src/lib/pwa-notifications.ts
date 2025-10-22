// Push notification utilities for PWA

/**
 * Check if push notifications are supported in the browser
 * Note: iOS has limited support - requires iOS 16.4+ and PWA installation
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for basic notification support
  const hasNotifications = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;

  // For iOS, we relax the PushManager requirement since it may not be available
  // but basic notifications might still work
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  if (isIOS) {
    // On iOS, just check for Notification API
    return hasNotifications && hasServiceWorker;
  }

  // For other browsers, require full support
  return hasServiceWorker && 'PushManager' in window && hasNotifications;
}

/**
 * Check the current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission | null {
  if (!isPushNotificationSupported()) return null;
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications
 * This creates a push subscription with the service worker
 * Note: iOS has limited support and may not support PushManager
 */
export async function subscribeToPushNotifications(userId: string): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }

  try {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;

    // Check if PushManager is available (not available on older iOS)
    if (!registration.pushManager) {
      console.warn('PushManager not available - limited notification support');
      // On iOS without PushManager, we can still use basic notifications
      // but not push subscriptions
      return null;
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications
      // Note: You'll need to generate VAPID keys for production
      // For now, we'll use userVisibleOnly which doesn't require VAPID keys
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) // Add this for production
      });
    }

    // Send subscription to server
    if (subscription) {
      await saveSubscriptionToServer(subscription, userId);
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    // Don't throw on iOS - just log and continue
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS) {
      console.warn('iOS has limited push notification support');
      return null;
    }
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const successful = await subscription.unsubscribe();

      if (successful) {
        // Notify server about unsubscription
        await removeSubscriptionFromServer(subscription);
      }

      return successful;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

/**
 * Save push subscription to server
 */
async function saveSubscriptionToServer(subscription: PushSubscription, userId: string): Promise<void> {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription to server');
    }
  } catch (error) {
    console.error('Error saving subscription to server:', error);
    throw error;
  }
}

/**
 * Remove push subscription from server
 */
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server');
    }
  } catch (error) {
    console.error('Error removing subscription from server:', error);
    throw error;
  }
}

/**
 * Show a local notification (doesn't require push subscription)
 * Useful for testing
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushNotificationSupported()) {
    throw new Error('Notifications are not supported');
  }

  const permission = await requestNotificationPermission();

  if (permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options,
    });
  } else {
    throw new Error('Notification permission denied');
  }
}

/**
 * Utility function to convert VAPID key (for production use)
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
