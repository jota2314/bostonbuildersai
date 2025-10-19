import { openai, models } from '@/lib/ai/provider';
import { streamText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { createCalendarEvent } from '@/lib/db-operations';
import type { CalendarEvent } from '@/lib/types';

export const runtime = 'edge';
// Request validation
const MessagePartSchema = z.object({
  type: z.string().optional(),
  text: z.string().optional(),
});

const MessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().optional(),
  parts: z.array(MessagePartSchema).optional(),
});

const BookAppointmentRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  ownerId: z.string(),
});

interface AppointmentData {
  visitor_name: string;
  visitor_email: string;
  visitor_phone?: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
}

async function createAppointment(appointmentData: AppointmentData, ownerId: string) {
  const eventData: CalendarEvent = {
    title: `Appointment: ${appointmentData.visitor_name}`,
    description: `${appointmentData.purpose}\n\nContact: ${appointmentData.visitor_email}\nPhone: ${appointmentData.visitor_phone || 'N/A'}`,
    event_date: appointmentData.date,
    start_time: appointmentData.start_time,
    end_time: appointmentData.end_time,
    user_id: ownerId,
  };

  return await createCalendarEvent(eventData);
}

export async function POST(req: Request) {
  const { messages: rawMessages, ownerId } = BookAppointmentRequestSchema.parse(await req.json());
  const today = new Date().toISOString().split('T')[0];

  // Clean messages: remove tool-related parts that convertToModelMessages can't handle
  const messages = rawMessages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => {
      if (msg.role === 'user') return msg;
      if (msg.role === 'assistant' && msg.parts) {
        const cleanParts = msg.parts.filter((part) => part.type === 'text');
        if (cleanParts.length > 0) {
          return { ...msg, parts: cleanParts };
        }
      }
      return null;
    })
    .filter((msg) => msg !== null);

  const result = streamText({
    model: openai(models.fast),
    messages: convertToModelMessages(messages),
    system: `You are a friendly appointment booking assistant for Jorge at Boston Builders AI.

Your role:
1. Greet visitors warmly and ask what they'd like to discuss
2. Collect their name, email, and phone number (optional)
3. Ask what date and time they prefer for the appointment
4. Confirm all details with them
5. Use book_appointment to schedule it
6. Provide a confirmation message with all appointment details

Important guidelines:
- Today's date is ${today}
- Be conversational and friendly
- Confirm all details before booking
- Mention that Jorge will send a calendar invite to their email
- Typical appointment duration is 30-60 minutes
- Standard business hours: 9 AM to 5 PM weekdays

Example conversation flow:
1. "Hi! I'm Jorge's scheduling assistant. What would you like to discuss?"
2. "Great! Can I get your name and email?"
3. "What date and time works best for you?"
4. "Perfect! Let me confirm: [summarize]. Should I book this?"
5. *Book appointment*
6. "All set! You're scheduled for [details]. Jorge will send you a calendar invite shortly."

Always be helpful and professional!`,
    tools: {
      book_appointment: tool({
        description: 'Book an appointment after confirming details with the visitor',
        inputSchema: z.object({
          visitor_name: z.string().describe('Full name of the visitor'),
          visitor_email: z.string().email().describe('Email of the visitor'),
          visitor_phone: z.string().optional().describe('Phone number of the visitor (optional)'),
          date: z.string().describe('Appointment date in YYYY-MM-DD format'),
          start_time: z.string().describe('Start time in HH:MM format (24-hour)'),
          end_time: z.string().describe('End time in HH:MM format (24-hour)'),
          purpose: z.string().describe('Purpose or topic of the appointment'),
        }),
        execute: async (args) => {
          return await createAppointment(args, ownerId);
        },
      }),
    },
    maxOutputTokens: 1000,
    temperature: 0.7,
  });

  return result.toUIMessageStreamResponse();
}
