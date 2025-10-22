import { NextRequest } from 'next/server';
import { openai, models } from '@/lib/ai/provider';
import { generateText } from 'ai';
import { getServerSupabase } from '@/lib/supabase-server';
import { saveCommunication } from '@/lib/db-operations';
import { sendSMS } from '@/lib/twilio-sms';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('📱 Incoming SMS from:', from);
    console.log('💬 Message:', body);

    if (!from || !body) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const supabase = getServerSupabase();

    // Find lead by phone number
    const { data: lead } = await supabase
      .from('leads')
      .select('id, contact_name, email, notes')
      .eq('phone', from)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lead) {
      console.log('⚠️ Lead not found for phone:', from);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Save incoming SMS to communications
    await saveCommunication({
      lead_id: lead.id,
      type: 'sms',
      direction: 'inbound',
      body,
      from_address: from,
      to_address: process.env.TWILIO_PHONE_NUMBER || '+18773695137',
      status: 'delivered',
      provider_id: messageSid,
      metadata: {
        type: 'discovery_sms_reply'
      }
    });

    // Get recent SMS conversation history
    const { data: recentComms } = await supabase
      .from('communications')
      .select('*')
      .eq('lead_id', lead.id)
      .eq('type', 'sms')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    // Build conversation context
    const conversationHistory = (recentComms || []).map(comm => ({
      role: comm.direction === 'outbound' ? 'assistant' : 'user',
      content: comm.body
    }));

    conversationHistory.push({
      role: 'user',
      content: body
    });

    // Use AI to determine next question
    const systemPrompt = \`You are Jorge's AI assistant helping gather discovery information via SMS.

Ask one question at a time about:
1. Website (Do they have one? URL?)
2. Services interested in (CRM, lead tracking, etc.)
3. Biggest business challenge
4. Other frustrations with current systems

Keep messages SHORT. After all questions answered, thank them.

Lead: \${lead.contact_name || 'there'}

Respond with ONLY the next SMS message (under 160 chars).\`;

    const result = await generateText({
      model: openai(models.default),
      messages: conversationHistory,
      system: systemPrompt,
      temperature: 0.7,
    });

    const responseText = result.text.trim();

    // Send SMS response
    await sendSMS({
      to: from,
      body: responseText
    });

    console.log('✅ SMS response sent:', responseText);

    // Save outgoing SMS to communications
    await saveCommunication({
      lead_id: lead.id,
      type: 'sms',
      direction: 'outbound',
      body: responseText,
      from_address: process.env.TWILIO_PHONE_NUMBER || '+18773695137',
      to_address: from,
      status: 'sent',
      metadata: {
        type: 'discovery_sms'
      }
    });

    // Update lead notes with conversation
    const conversationText = conversationHistory
      .map(msg => \`\${msg.role === 'user' ? 'Client' : 'AI'}: \${msg.content}\`)
      .join('\n');

    const existingNotes = lead.notes || '';
    const smsHeader = '\n\n📱 SMS Discovery:\n';
    const updatedNotes = existingNotes.includes(smsHeader)
      ? existingNotes.replace(
          new RegExp(\`\${smsHeader}[\\s\\S]*$\`),
          \`\${smsHeader}\${conversationText}\`
        )
      : \`\${existingNotes}\${smsHeader}\${conversationText}\`;

    await supabase
      .from('leads')
      .update({ notes: updatedNotes })
      .eq('id', lead.id);

    console.log('✅ Lead notes updated');

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('❌ Error handling SMS webhook:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
