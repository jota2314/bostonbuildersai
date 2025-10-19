import { NextResponse } from 'next/server';
import { updatePhoneCall } from '@/lib/db-operations';

export async function POST(req: Request) {
  try {
    // Verify API secret key (security)
    const authHeader = req.headers.get('Authorization');
    const apiSecret = process.env.API_SECRET_KEY;

    if (!authHeader || authHeader !== `Bearer ${apiSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { callSid, updates } = await req.json();

    // Validate required fields
    if (!callSid || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: callSid, updates' },
        { status: 400 }
      );
    }

    // Update phone call
    const result = await updatePhoneCall(callSid, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update phone call' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('❌ Error updating call:', error);
    return NextResponse.json(
      { error: 'Failed to update call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
