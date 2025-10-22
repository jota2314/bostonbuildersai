import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

// Configure web-push with VAPID keys (you'll need to generate these)
// Generate keys with: npx web-push generate-vapid-keys
// Store in .env.local:
// VAPID_PUBLIC_KEY=...
// VAPID_PRIVATE_KEY=...
// VAPID_SUBJECT=mailto:jorge@bostonbuildersai.com

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:jorge@bostonbuildersai.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface SendNotificationBody {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  url?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, icon, badge, data, url }: SendNotificationBody =
      await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, body' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated (only authenticated users can send notifications)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all push subscriptions for the user
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('subscription_data')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found for user' },
        { status: 404 }
      );
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/logo.png',
      badge: badge || '/logo.png',
      data: {
        ...data,
        url: url || '/dashboard',
        timestamp: Date.now(),
      },
    });

    // Send notification to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription_data, payload);
          return { success: true };
        } catch (error) {
          console.error('Error sending notification:', error);

          // If subscription is no longer valid, delete it
          if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.subscription_data.endpoint);
          }

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, error: errorMessage };
        }
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${successCount} subscriptions`,
      sent: successCount,
      failed: failureCount,
    });
  } catch (error) {
    console.error('Send notification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
