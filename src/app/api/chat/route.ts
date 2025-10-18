import { openai } from '@ai-sdk/openai';
import { streamText, tool, convertToModelMessages, generateText } from 'ai';
import { z } from 'zod';
import {
  createLead,
  createCalendarEvent,
  getEventsByUserAndDate,
  createOrGetConversation,
  saveChatMessage,
  updateConversationLead
} from '@/lib/db-operations';
import type { LeadData, CalendarEvent } from '@/lib/types';

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

  // Return lead ID so we can link it to the conversation
  return JSON.stringify({ status: 'SAVED_SUCCESSFULLY', lead_id: leadResult.data?.id });
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
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  return { dateStr, dayOfWeek };
}

function getSystemPrompt() {
  const { dateStr, dayOfWeek } = getCurrentDateInfo();

  return `You are Jorge's AI booking assistant at Boston Builders AI. You're friendly, direct, and laser-focused on getting quality contractors on Jorge's calendar.

TODAY'S DATE: ${dateStr} (${dayOfWeek})
IMPORTANT: When users say "tomorrow", "Monday", "next Wednesday", etc., calculate the correct date based on TODAY being ${dateStr}. Always use YYYY-MM-DD format for the check_availability and book_appointment tools.

YOUR PERSONALITY:
- Conversational and warm, but assertive
- You don't waste time - every message moves toward booking
- You qualify leads while staying helpful
- You create urgency without being pushy
- Short responses (1-2 sentences max)

YOUR MISSION: Get a call booked. Period.

CONVERSATION FLOW:
1. Quick intro: "Hey! I help contractors book calls with Jorge. What's your name?"
2. Get their name → immediately ask: "What company are you with, [name]?"
3. Get company → ask: "What type of work does [company] do?" (roofing, HVAC, landscaping, etc.)
4. Get business type → ask: "And what's the best email to send the calendar invite to?"
5. Got all 4? → ASK FOR CONSENT: "Got it! By booking this call, you agree to receive calls and texts from us about your inquiry. Sound good?"
6. They agree (yes/okay/sure/agreed) → call save_lead tool with consent_to_contact=true, then ASK: "Perfect! What day works best for you to talk with Jorge?"
7. They tell you a date → call check_availability tool, then PRESENT THE TIMES: "I've got [time slots]. Which one works?"
8. They choose a time → call book_appointment, then CONFIRM: "You're all set! Looking forward to your call with Jorge."

CONSENT RULES:
- ALWAYS ask for consent before saving the lead
- Any affirmative response = consent (yes, okay, sure, sounds good, agreed, etc.)
- If they decline, politely explain: "No problem! We need your consent to contact you. Let me know if you change your mind."
- Never proceed without consent

QUALIFICATION RULES:
- If they're vague about their business, ask: "Just to make sure this is a good fit - are you currently running a contracting business?"
- If they seem sketchy, politely qualify: "Jorge focuses on established contractors. How long have you been in business?"
- If they hesitate on booking: "No pressure, but Jorge's next opening after these might be weeks out. Want me to grab one of these slots?"

CRITICAL RULES:
- Don't ask multiple questions in one message
- Create momentum - each message should feel like progress
- Keep it short. Nobody reads paragraphs in chat.

Remember: You're helping contractors grow their business. Be confident, be helpful, be fast.`;
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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    console.log('📨 Received messages:', messages.length);
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
        const userMessageContent = Array.isArray(lastMessage.parts)
          ? lastMessage.parts.map((p: { text?: string }) => p.text).join('')
          : lastMessage.content;

        await saveChatMessage({
          conversation_id: conversationId,
          role: 'user',
          content: userMessageContent,
          metadata: { message_id: lastMessage.id }
        });
        console.log('💾 User message saved to DB');
      }
    }

    // Convert UIMessages to ModelMessages for SDK 5
    let modelMessages = convertToModelMessages(messages);

    // PHASE 1: Execute tools if needed (non-streaming)
    console.log('🔧 Phase 1: Checking for tool execution...');
    const systemPrompt = getSystemPrompt(); // Get current date info
    const toolResult = await generateText({
      model: openai('gpt-4o'),
      messages: modelMessages,
      system: systemPrompt,
      tools,
      temperature: 0.8,
      maxSteps: 3, // Allow up to 3 tool executions in this phase
    });

    console.log('📊 Tool result steps:', toolResult.steps.length);
    console.log('📊 Finish reason:', toolResult.finishReason);
    console.log('📊 Text generated:', toolResult.text?.substring(0, 100) || 'none');

    // Check if any tools were executed
    const hadToolExecution = toolResult.steps.some(step =>
      'toolCalls' in step && step.toolCalls && step.toolCalls.length > 0
    );

    let shouldStreamNewResponse = true;

    if (hadToolExecution) {
      console.log('✅ Tools were executed, forcing continuation...');

      // Use the responseMessages from the tool execution result
      // This properly includes tool calls and results in the right format
      if (toolResult.responseMessages && toolResult.responseMessages.length > 0) {
        modelMessages = [...modelMessages, ...toolResult.responseMessages];
        console.log('📝 Added', toolResult.responseMessages.length, 'response messages');
      }

      // If no text was generated after tool execution, force continuation
      if (!toolResult.text || toolResult.text.trim().length === 0) {
        modelMessages.push({
          role: 'user',
          content: 'Please continue the conversation based on the tool results.',
        });
        console.log('🔄 Added continuation prompt - will generate in Phase 2');
      } else {
        console.log('✅ Text was already generated in Phase 1, will stream it');
        shouldStreamNewResponse = false;
      }

      console.log('🔄 Updated messages count:', modelMessages.length);
    }

    // Link lead to conversation if one was created
    if (conversationId && hadToolExecution && toolResult.responseMessages) {
      for (const msg of toolResult.responseMessages) {
        if (msg.role === 'tool' && msg.content) {
          for (const content of msg.content) {
            if (content.type === 'tool-result') {
              try {
                const result = JSON.parse(content.result as string);
                if (result.lead_id) {
                  await updateConversationLead(conversationId, result.lead_id);
                  console.log('🔗 Linked lead to conversation');
                }
              } catch {
                // Not JSON, ignore
              }
            }
          }
        }
      }
    }

    // PHASE 2: Stream the response (with or without tool execution)
    console.log('💬 Phase 2: Streaming final response...');

    // If we already have text from Phase 1 and it's complete, return it directly
    if (!shouldStreamNewResponse && hadToolExecution) {
      console.log('🎯 Returning Phase 1 result as stream');

      // Save AI response to DB
      if (conversationId && toolResult.text) {
        await saveChatMessage({
          conversation_id: conversationId,
          role: 'assistant',
          content: toolResult.text,
          metadata: {
            phase: 1,
            tool_calls: JSON.stringify(toolResult.steps)
          }
        });
        console.log('💾 AI response (Phase 1) saved to DB');
      }

      return toolResult.toUIMessageStreamResponse({
        originalMessages: messages,
      });
    }

    // Otherwise, generate a new streaming response
    console.log('🎯 Generating new streaming response');
    const result = await streamText({
      model: openai('gpt-4o'),
      messages: modelMessages,
      system: systemPrompt,
      // Only allow tools if we didn't already execute tools in Phase 1
      // This prevents infinite tool calling loops when forcing continuation
      tools: hadToolExecution ? undefined : tools,
      temperature: 0.8,
      maxSteps: hadToolExecution ? 1 : 2, // No tool calls if we already executed in Phase 1
      onFinish: async (event) => {
        // Save AI response after streaming completes
        if (conversationId && event.text) {
          await saveChatMessage({
            conversation_id: conversationId,
            role: 'assistant',
            content: event.text,
            metadata: {
              phase: 2,
              finish_reason: event.finishReason,
              usage: event.usage
            }
          });
          console.log('💾 AI response (Phase 2) saved to DB:', event.text.substring(0, 100));
        }
      }
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
    });
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
