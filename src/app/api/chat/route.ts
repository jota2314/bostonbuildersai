import { openai, models } from '@/lib/ai/provider';
import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import {
  createLead,
  createCalendarEvent,
  getEventsByUserAndDate,
  createOrGetConversation,
  saveChatMessage
} from '@/lib/db-operations';
import type { LeadData, CalendarEvent } from '@/lib/types';

// Request validation
const MessagePartSchema = z.object({
  type: z.string().optional(),
  text: z.string().optional(),
});

const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().optional(),
  parts: z.array(MessagePartSchema).optional(),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
});

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Generate a session ID from the first user message or use a timestamp
function getSessionId(messages: Array<{ id?: string }>): string {
  const firstMessageId = messages[0]?.id;
  return firstMessageId ? `session_${firstMessageId}` : `session_${Date.now()}`;
}

const JORGE_USER_ID = process.env.JORGE_USER_ID || 'your-user-id-here';

// Tool 1: Save lead only
async function saveLead(args: {
  contact_name: string;
  email: string;
  company_name: string;
  business_type: string;
  phone?: string;
  annual_revenue?: number;
  location?: string;
  notes?: string;
  consent_to_contact: boolean;
}) {
  console.log('💾 Saving lead:', args.contact_name);

  // Require consent
  if (!args.consent_to_contact) {
    console.error('❌ No consent provided');
    return `ERROR: Cannot save lead without consent to contact. Please ask the user to agree to be contacted.`;
  }

  const leadData: LeadData = {
    company_name: args.company_name,
    contact_name: args.contact_name,
    email: args.email,
    phone: args.phone || null,
    business_type: args.business_type,
    annual_revenue: args.annual_revenue || null,
    location: args.location || null,
    notes: args.notes || null,
    source: 'ai_chat',
    status: 'new',
    priority: 'high',
    user_id: null,
    consent_to_contact: args.consent_to_contact,
    consent_date: new Date().toISOString(),
    consent_ip_address: null, // We'll add IP capture later
  };

  const leadResult = await createLead(leadData);

  if (!leadResult.success) {
    console.error('❌ Error saving lead:', leadResult.error);
    return `ERROR: Could not save lead information. Please ask the user to try again.`;
  }

  console.log('✅ Lead saved successfully with consent');

  // Return a clear message that tells the AI to proceed to scheduling
  return `Lead information saved successfully. Now ask the user what day works best for their call with Jorge.`;
}

// Tool 2: Check availability for a specific date
async function checkAvailability(args: {
  date: string; // Format: YYYY-MM-DD
}) {
  console.log('📅 Checking availability for:', args.date);

  const availabilityResult = await getEventsByUserAndDate(JORGE_USER_ID, args.date);
  const events = (availabilityResult.data || []) as Array<{ start_time?: string | null; end_time?: string | null }>;

  // Calendar hours: 7 AM to 10 PM (22:00) every day
  const workStart = 7;
  const workEnd = 22;

  const busySlots = events.map((e: { start_time?: string | null; end_time?: string | null }) => ({
    start: e.start_time,
    end: e.end_time,
  }));

  const slots: Array<{ start: string; end: string }> = [];

  for (let hour = workStart; hour < workEnd; hour++) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

    const hasConflict = busySlots.some((busy) => {
      if (!busy.start || !busy.end) return false;
      return (
        (startTime >= busy.start && startTime < busy.end) ||
        (endTime > busy.start && endTime <= busy.end) ||
        (startTime <= busy.start && endTime >= busy.end)
      );
    });

    if (!hasConflict) {
      slots.push({ start: startTime, end: endTime });
    }
  }

  const availableSlots = slots.slice(0, 5);
  console.log(`✅ Found ${availableSlots.length} slots for ${args.date}`);

  if (availableSlots.length === 0) {
    return `No available slots on ${args.date}. Please try another date.`;
  }

  // Format slots with labels
  const formattedSlots = availableSlots.map((slot) => {
    const hour = parseInt(slot.start.split(':')[0]);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour} ${ampm}`;
  });

  const message = `Available times: ${formattedSlots.join(', ')}`;
  console.log('📨 Returning to AI:', message);

  return message;
}

// Book appointment tool
async function bookAppointment(args: {
  name: string;
  email: string;
  date: string;
  start_time: string;
  end_time: string;
  phone?: string;
  company?: string;
  purpose?: string;
}) {
  console.log('📞 Booking appointment for:', args.name);

  const eventData: CalendarEvent = {
    title: `Call with ${args.name}`,
    description: `Company: ${args.company || 'N/A'}\nEmail: ${args.email}\nPhone: ${args.phone || 'N/A'}\nPurpose: ${args.purpose || 'Discovery call'}`,
    event_date: args.date,
    start_time: args.start_time,
    end_time: args.end_time,
    user_id: JORGE_USER_ID,
  };

  const result = await createCalendarEvent(eventData);

  if (!result.success) {
    console.error('❌ Error booking:', result.error);
    return result;
  }

  console.log('✅ Appointment booked');
  return `Successfully booked! Your call with Jorge is scheduled for ${args.date} at ${args.start_time}.`;
}

// Get current date for the AI
function getCurrentDateInfo() {
  const now = new Date();
  // Use timezone-safe date formatting to avoid day shifts
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  return { dateStr, dayOfWeek };
}

function getSystemPrompt() {
  const { dateStr, dayOfWeek } = getCurrentDateInfo();

  return `You are Jorge's AI assistant at Boston Builders AI. You're friendly, knowledgeable, and passionate about helping contractors grow their businesses with custom software.

TODAY'S DATE: ${dateStr} (${dayOfWeek})
IMPORTANT: When users say "tomorrow", "Monday", "next Wednesday", etc., calculate the correct date based on TODAY being ${dateStr}. Always use YYYY-MM-DD format for the check_availability and book_appointment tools.

===== ABOUT BOSTON BUILDERS AI =====

WHO WE ARE:
Boston Builders AI builds custom software for established contractors ($500k+ annual revenue). We're NOT a generic SaaS platform - every client gets their own custom codebase, their own database, their own deployment, and full ownership of everything.

WHO IS JORGE:
Jorge Betancur has 7 years of construction experience (laborer → General Manager) and is a self-taught developer. He's built systems for Solar Señorita and Econova Energy Savings. He understands contractor workflows because he's lived them. His value proposition: "Built by someone who's been in the trenches."

WHAT WE BUILD:
We create a template library approach - we build features in our development lab, then copy and customize them for each client's specific trade. Each client gets their own separate repository, their own database (full data isolation), their own deployment, their own custom domain, and full ownership that can be transferred to their account.

FEATURES WE OFFER (Customizable per client):
Lead Hunter (permit tracking dashboards), CRM (lead pipeline and contact tracking), Estimating Tools (custom pricing templates and proposals), Project Management (job scheduling and crew assignments), SEO Websites (trade-specific landing pages), AI Chat and Voice (automated lead qualification like this chat!), Calendar Integration (smart scheduling).

When mentioning features, just mention 2-3 naturally in a sentence. Don't list them all out.

WHO IT'S FOR:
All construction trades - insulation, spray foam, plumbing, electrical, HVAC, roofing, siding, windows, doors, stucco, tile, paint, masonry, concrete, waterproofing, woodwork, framing, carpentry, general contractors, and restoration. Minimum: $500k+ annual revenue and ready to invest in custom systems.

PRICING APPROACH:
Custom pricing based on features needed - this isn't one-size-fits-all. We'll discuss your specific needs on the call with Jorge.

===== YOUR PERSONALITY =====
- Warm, enthusiastic, and genuinely helpful
- Like a knowledgeable friend who's excited to help
- You answer questions conversationally - like you're texting a friend
- You understand construction and contractors' pain points
- You're confident but never pushy
- VERY SHORT responses (1-2 sentences max, never more than 3)
- NO MARKDOWN FORMATTING - no asterisks, no bullet points, no dashes, no lists
- Just plain, natural conversation
- You make people feel understood and excited about the possibilities

===== YOUR MISSION =====
Help contractors understand what we offer AND get a call booked with Jorge. Balance education with momentum toward booking.

===== CONVERSATION FLOW =====

WHEN THEY START ASKING QUESTIONS:
If they ask about services, features, pricing, Jorge's background, or how it works:
- Answer their question thoroughly but concisely
- Show genuine understanding of their pain points
- After answering, gently guide toward booking: "Want to hop on a quick call with Jorge to discuss how this could work for your business?"
- Be patient - answer as many questions as they need

WHEN READY TO BOOK (They say "schedule", "book", "meeting", or you sense interest):
1. Get their name: "Great! What's your name?"
2. Get company: "Awesome, [name]! What company are you with?"
3. Get business type: "Nice! What type of work does [company] do?" (roofing, HVAC, etc.)
4. Get phone number: "What's the best number to reach you at?"
5. Get email: "And what's the best email to send the calendar invite to?"
6. ASK FOR CONSENT: "Got it! By booking this call, you agree to receive calls and texts from us about your inquiry. Sound good?"
7. They agree (yes/okay/sure/agreed) → call save_lead tool with consent_to_contact=true
8. After save_lead succeeds → ASK: "Perfect! What day works best for you to talk with Jorge?"
9. They give a date → call check_availability tool → PRESENT TIMES: "I've got [time slots]. Which one works for you?"
10. They choose time → call book_appointment → CONFIRM: "You're all set! Jorge is looking forward to talking with you on [date] at [time]."

===== ANSWERING COMMON QUESTIONS =====

CRITICAL: Keep answers SHORT and conversational. NO bullet points, NO asterisks, NO dashes. Just natural text like you're chatting with a friend.

"What's the pricing?"
→ "It's custom based on what you need - some contractors just want a CRM, others want the full suite. Jorge will give you a clear quote on the call based on your specific situation."

"How is this different from [other software]?"
→ "The biggest difference? You OWN everything. Your own codebase, your own database, full ownership. Plus Jorge actually worked in construction for 7 years, so he gets your world."

"What features do you have?" or "What do you build?"
→ Pick 2-3 relevant ones and list naturally: "We build stuff like permit tracking dashboards, CRM systems, estimating tools, project management, AI chat like this one. Really whatever your business needs." (NO bullet points, just conversational)

"Tell me about Jorge"
→ "Jorge worked in construction for 7 years, then taught himself to code. He built systems for solar companies and gets both sides - the field work and the tech. Basically building tools he wished he had when running jobs."

"Is this a SaaS platform?"
→ "Nope! You're not sharing a platform with thousands of users. Each client gets their own custom setup that they fully own. Think custom software, but we use proven templates so you're not starting from scratch."

===== IMPORTANT RULES =====

CONSENT:
- ALWAYS ask for consent before calling save_lead
- Any affirmative response = consent (yes, okay, sure, sounds good, agreed, etc.)
- If they decline, say: "No worries! We need your consent to contact you. Feel free to ask me anything else, and let me know if you'd like to book later."
- Never call save_lead without consent_to_contact=true

QUALIFICATION:
- If they're vague about their business: "Just to make sure this is a good fit - are you currently running a contracting business?"
- If annual revenue seems low: "Jorge typically works with contractors doing $500k+ annually. Does that sound about right for your business?"
- Be tactful but honest about fit

TONE & PACING:
- Keep responses VERY SHORT (1-2 sentences max, 3 is pushing it)
- Don't ask multiple questions in one message
- Be conversational, not robotic - like texting a friend
- Show enthusiasm without being salesy
- ABSOLUTELY NO MARKDOWN - no asterisks, no bullet points, no dashes, no formatting
- Never make lists - just natural flowing text
- IMPORTANT: After calling ANY tool, you MUST respond with a short message to the user. Never end the conversation after a tool call without a text response.

Remember: You're not just booking calls - you're building relationships. Help first, book second. But always be moving the conversation forward. And keep it SHORT and NATURAL - no one likes reading essays in chat.`;
}

const tools = {
  save_lead: tool({
    description: 'Save the lead information to the database. IMPORTANT: Only call this after the user has given consent to be contacted (agreed to receive calls/texts). After calling this tool, ask the user what day they prefer for a call.',
    inputSchema: z.object({
      contact_name: z.string(),
      email: z.string().email(),
      company_name: z.string(),
      business_type: z.string(),
      phone: z.string().optional(),
      annual_revenue: z.number().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
      consent_to_contact: z.boolean().describe('User has agreed to receive calls and texts. Only set to true if user explicitly agreed.'),
    }),
    execute: async (args) => {
      return await saveLead(args);
    },
  }),
  check_availability: tool({
    description: 'Check available appointment times for a specific date.',
    inputSchema: z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
    }),
    execute: async (args) => {
      return await checkAvailability(args);
    },
  }),
  book_appointment: tool({
    description: 'Book the chosen time and confirm.',
    inputSchema: z.object({
      name: z.string(),
      email: z.string().email(),
      date: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      phone: z.string().optional(),
      company: z.string().optional(),
      purpose: z.string().optional(),
    }),
    execute: async (args) => {
      return await bookAppointment(args);
    },
  }),
};

type MessagePart = { type?: string; text?: string };
type ChatMessage = { id: string; role: 'user' | 'assistant' | 'system'; content?: string; parts?: MessagePart[] };

export async function POST(req: Request) {
  try {
    const { messages: rawMessages } = ChatRequestSchema.parse(await req.json());

    // Clean messages: remove tool-related parts that convertToModelMessages can't handle
    const messages = rawMessages
      .filter((msg: ChatMessage) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: ChatMessage) => {
        if (msg.role === 'user') return msg;

        // For assistant messages, filter out step-start and tool parts, keep only text
        if (msg.role === 'assistant') {
          const cleanParts = (msg.parts || []).filter((part: MessagePart) => part.type === 'text');

          // Only keep assistant message if it has text content
          if (cleanParts.length > 0) {
            return { ...msg, parts: cleanParts };
          }
        }
        return null;
      })
      .filter((msg: ChatMessage | null) => msg !== null);

    console.log('📨 Received messages:', rawMessages.length, '→ Filtered to:', messages.length);
    console.log('Filtered messages:', JSON.stringify(messages, null, 2));
    console.log('Last user message:', messages[messages.length - 1]);

    // Create or get conversation
    const sessionId = getSessionId(messages);
    const conversationResult = await createOrGetConversation(sessionId);
    const conversationId = conversationResult.data?.id;

    if (!conversationId) {
      console.error('❌ Failed to create/get conversation');
    } else {
      console.log('💬 Conversation ID:', conversationId);

      // Save the latest user message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        const userMessageContent: string = Array.isArray(lastMessage.parts)
          ? lastMessage.parts.map((p: { text?: string }) => p.text || '').join('')
          : (lastMessage.content || '');

        await saveChatMessage({
          conversation_id: conversationId,
          role: 'user',
          content: userMessageContent,
          metadata: { message_id: lastMessage.id }
        });
        console.log('💾 User message saved to DB');
      }
    }

    // Convert UI messages and stream the response with tools (SDK 5)
    const systemPrompt = getSystemPrompt();
    const result = await streamText({
      model: openai(models.default),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: convertToModelMessages(messages as any),
      system: systemPrompt,
      tools,
      temperature: 0.8,
      stopWhen: stepCountIs(10), // Allow up to 10 steps before stopping
      onFinish: async (event) => {
        if (conversationId && event.text) {
          await saveChatMessage({
            conversation_id: conversationId,
            role: 'assistant',
            content: event.text,
            metadata: {
              finish_reason: event.finishReason,
              usage: event.usage,
              steps: event.steps?.length || 0
            }
          });
          console.log('💾 AI response saved to DB', `(${event.text.substring(0, 80)}...)`);
        } else if (conversationId) {
          console.log('⚠️ No text generated after', event.steps?.length || 0, 'steps');
        }
      }
    });

    // Don't pass originalMessages - let SDK 5 handle message construction
    // This avoids tool-call conversion errors on subsequent requests
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('❌ Chat error:', error);

    // Return a friendly error message as a text stream
    const errorText = "Sorry, I had a technical hiccup. Can you please rephrase that?";
    return new Response(errorText, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
