import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { ai_enabled } = await req.json();
    const leadId = params.id;

    // Validate input
    if (typeof ai_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'ai_enabled must be a boolean' },
        { status: 400 }
      );
    }

    // Update the lead's ai_enabled status
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('leads')
      .update({ ai_enabled })
      .eq('id', leadId)
      .select('id, ai_enabled')
      .single();

    if (error) {
      console.error('Error updating AI status:', error);
      return NextResponse.json(
        { error: 'Failed to update AI status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in toggle-ai API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
