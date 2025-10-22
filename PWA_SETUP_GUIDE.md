# PWA Setup Guide - Boston Builders AI

Your app is now set up as a Progressive Web App (PWA) with push notification support! 🎉

## ✅ What's Already Done

1. **next-pwa installed and configured** - Your app can now be installed on mobile devices
2. **Service worker setup** - Handles offline caching and push notifications
3. **Manifest file** - Defines how your app appears when installed
4. **Push notification infrastructure** - Full API and client-side code ready
5. **Notification components** - UI to prompt users for notification permission
6. **Database migration** - SQL file ready to create push_subscriptions table

---

## 🚀 Quick Start (3 Steps)

### Step 1: Add Environment Variables

Add these to your `.env.local` file:

```bash
# VAPID Keys for Push Notifications (generated for you)
VAPID_PUBLIC_KEY=BPMijljLclH7yEOTbanRz_SGvnwFC4EYK8f14LSbm1BFwBZVS7NUxRhr2Gx93XcFhNoDcomzHgDrfJXbiLqx2Y4
VAPID_PRIVATE_KEY=YBpEaJ3v5cM7bpK7mDhDaOES5VopVfIOb0lYkKUm7wM
VAPID_SUBJECT=mailto:jorge@bostonbuildersai.com

# App URL (for notifications)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to your production URL when deploying
```

### Step 2: Create Database Table

Run this SQL in your Supabase SQL Editor:

```sql
-- The migration file is already created at:
-- supabase/migrations/create_push_subscriptions_table.sql

-- You can either:
-- 1. Copy the contents and run in Supabase SQL Editor, OR
-- 2. Use Supabase CLI: supabase db push
```

Or run this command if you have Supabase CLI:

```bash
cd boston-builders-landing
npx supabase db push
```

### Step 3: Add Notification Prompt to Dashboard

Add the `NotificationPrompt` component to your dashboard layout:

**Option A: Add to `src/app/dashboard/layout.tsx`**

```tsx
import NotificationPrompt from '@/components/NotificationPrompt';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      {children}
      {user && <NotificationPrompt userId={user.id} />}
    </div>
  );
}
```

**Option B: Add to `src/app/dashboard/page.tsx`**

```tsx
import NotificationPrompt from '@/components/NotificationPrompt';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      {/* Your existing dashboard content */}
      {user && <NotificationPrompt userId={user.id} />}
    </div>
  );
}
```

---

## 📱 Testing Your PWA

### Test Installation (Mobile)

1. **Build the app**: `npm run build && npm run start`
2. **Open on mobile**: Visit your app in Chrome (Android) or Safari (iOS)
3. **Install prompt**: You should see "Add to Home Screen" or an install prompt
4. **Install**: Tap to install the app to your home screen
5. **Open**: Launch the app from your home screen - it should look like a native app!

### Test Notifications (Desktop)

1. **Run dev server**: `npm run dev`
2. **Log in to dashboard**: Visit `/dashboard`
3. **Permission prompt**: You should see the notification permission prompt
4. **Allow notifications**: Click "Enable"
5. **Test notification**: You should receive a test notification immediately

### Test Notification from API

Use this curl command to send a test notification:

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "title": "Test Notification",
    "body": "This is a test notification from Boston Builders AI!",
    "url": "/dashboard"
  }'
```

---

## 🔔 Sending Notifications from Your Code

### Option 1: Use Helper Functions (Recommended)

```typescript
import { notifyNewLead, notifyNewMessage, notifyMeetingBooked } from '@/lib/send-push-notification';

// When a new lead is created
await notifyNewLead(userId, leadName, leadId);

// When you receive a new message
await notifyNewMessage(userId, leadName, 'email', leadId);

// When a meeting is booked
await notifyMeetingBooked(userId, leadName, meetingDate, leadId);
```

### Option 2: Use Generic Function

```typescript
import { sendPushNotification } from '@/lib/send-push-notification';

await sendPushNotification({
  userId: 'user-id',
  title: '🎉 Something awesome happened!',
  body: 'Check it out in your dashboard',
  url: '/dashboard/some-page',
  data: { customField: 'value' }
});
```

### Option 3: Call API Directly

```typescript
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    title: 'Notification Title',
    body: 'Notification body text',
    url: '/dashboard'
  })
});
```

---

## 🔧 Integration Examples

### Example 1: Notify on New Lead (in `/api/leads/route.ts`)

```typescript
import { notifyNewLead } from '@/lib/send-push-notification';

export async function POST(request: Request) {
  // ... your existing lead creation code ...

  const { data: lead } = await supabase
    .from('leads')
    .insert({ ... })
    .select()
    .single();

  // Send push notification
  const jorgeUserId = process.env.JORGE_USER_ID || process.env.USER_ID;
  if (jorgeUserId) {
    await notifyNewLead(jorgeUserId, lead.company_name, lead.id);
  }

  return NextResponse.json({ success: true, lead });
}
```

### Example 2: Notify on Inbound SMS/Email (in webhook routes)

```typescript
import { notifyNewMessage } from '@/lib/send-push-notification';

// In your webhook handler
const jorgeUserId = process.env.JORGE_USER_ID;
if (jorgeUserId) {
  await notifyNewMessage(jorgeUserId, leadName, 'sms', leadId);
}
```

### Example 3: Notify on Meeting Booked (in `/api/book-appointment/route.ts`)

```typescript
import { notifyMeetingBooked } from '@/lib/send-push-notification';

// After booking is created
const jorgeUserId = process.env.JORGE_USER_ID;
if (jorgeUserId) {
  await notifyMeetingBooked(
    jorgeUserId,
    leadName,
    meetingDate,
    leadId
  );
}
```

---

## 📋 What You Can Do Now

- ✅ **Install on mobile**: Your app can be installed like a native app
- ✅ **Offline support**: Basic offline caching is enabled
- ✅ **Push notifications**: Full push notification system ready
- ✅ **Home screen shortcuts**: Quick access to Dashboard and Leads
- ✅ **Native appearance**: Full-screen, no browser chrome

---

## 🔐 Security Notes

- ✅ VAPID keys are generated and secure
- ✅ RLS policies protect subscription data
- ✅ Only authenticated users can receive notifications
- ✅ Subscriptions are tied to user accounts
- ⚠️ **Important**: Keep your VAPID_PRIVATE_KEY secret!

---

## 🚀 Deployment

When deploying to production:

1. Update `NEXT_PUBLIC_APP_URL` to your production URL
2. Add all environment variables to Vercel/your hosting platform
3. Run the database migration on production Supabase
4. Test notifications on production

---

## 📱 Platform Support

| Feature | Chrome Android | Safari iOS | Desktop |
|---------|----------------|------------|---------|
| Install PWA | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ⚠️ Limited* | ✅ |
| Offline Support | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ✅ |

*iOS 16.4+ supports web push, but with limitations

---

## 🐛 Troubleshooting

### "Notifications not showing up"
- Check that you've added VAPID keys to .env.local
- Verify the push_subscriptions table exists in Supabase
- Restart your dev server after adding env variables
- Check browser console for errors

### "Can't install PWA"
- Make sure you're using HTTPS (or localhost)
- Check that manifest.json is accessible at /manifest.json
- Verify service worker is registered (check DevTools > Application > Service Workers)

### "Permission prompt not appearing"
- User may have already granted/denied permission
- Check `localStorage.getItem('notification-prompt-dismissed')`
- Clear localStorage or use incognito mode to test

---

## 📚 Files Created

```
boston-builders-landing/
├── next.config.mjs (updated for PWA)
├── public/
│   ├── manifest.json (updated)
│   └── sw-custom.js (new - custom service worker)
├── src/
│   ├── app/
│   │   ├── layout.tsx (updated with PWA meta tags)
│   │   └── api/notifications/
│   │       ├── subscribe/route.ts (new)
│   │       ├── unsubscribe/route.ts (new)
│   │       └── send/route.ts (new)
│   ├── components/
│   │   └── NotificationPrompt.tsx (new)
│   └── lib/
│       ├── pwa-notifications.ts (new - client-side utils)
│       └── send-push-notification.ts (new - server-side utils)
├── supabase/migrations/
│   └── create_push_subscriptions_table.sql (new)
└── PWA_SETUP_GUIDE.md (this file)
```

---

## 🎉 You're Done!

Your app is now a fully functional PWA with push notifications. Follow the 3 steps above to complete the setup, and you'll be receiving mobile notifications in minutes!

Need help? Check the troubleshooting section or refer to the code comments in the created files.
