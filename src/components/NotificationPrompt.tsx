'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  subscribeToPushNotifications,
  showLocalNotification,
} from '@/lib/pwa-notifications';

interface NotificationPromptProps {
  userId: string;
  autoShow?: boolean;
}

export default function NotificationPrompt({ userId, autoShow = true }: NotificationPromptProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (supported) {
      const currentPermission = getNotificationPermissionStatus();
      setPermission(currentPermission);

      // Auto-show prompt if permission is default (not granted or denied)
      if (autoShow && currentPermission === 'default') {
        // Wait a bit before showing the prompt (better UX)
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [autoShow]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        // Subscribe to push notifications
        await subscribeToPushNotifications(userId);

        // Show a test notification
        await showLocalNotification('Notifications Enabled!', {
          body: 'You will now receive updates from Boston Builders AI',
          icon: '/logo.png',
          badge: '/logo.png',
        });

        // Hide the prompt
        setShowPrompt(false);
      } else {
        setError('Notification permission was denied');
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setError('Failed to enable notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember that user dismissed the prompt (store in localStorage)
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  // Don't render if:
  // - Not supported
  // - Already granted or denied
  // - User dismissed the prompt
  // - Prompt shouldn't be shown
  if (
    !isSupported ||
    !showPrompt ||
    permission === 'granted' ||
    permission === 'denied' ||
    localStorage.getItem('notification-prompt-dismissed') === 'true'
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Enable Notifications</h3>
              <p className="text-xs text-gray-500">Stay updated on new leads</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <p className="text-sm text-gray-600 mb-4">
          Get instant notifications when you receive new leads, messages, or meeting bookings.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Enabling...' : 'Enable'}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
