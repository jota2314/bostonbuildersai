import { openai, models } from '@/lib/ai/provider';
import { streamText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { createCalendarEvent, createTodo } from '@/lib/db-operations';
import type { CalendarEvent, Todo } from '@/lib/types';

export const runtime = 'edge';
// Request validation
const MessagePartSchema = z.object({
  type: z.string().optional(),
  text: z.string().optional(),
});

const MessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']).optional(),
  content: z.string().optional(),
  parts: z.array(MessagePartSchema).optional(),
});

const CalendarChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  userId: z.string(),
  currentDate: z.string().optional(),
  events: z.any().optional(),
  todos: z.any().optional(),
});

export async function POST(req: Request) {
  try {
    const { messages: rawMessages, userId, currentDate, events, todos } = CalendarChatRequestSchema.parse(await req.json());
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

    const result = await streamText({
    model: openai(models.fast),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: convertToModelMessages(messages as any),
    system: `You are a helpful calendar assistant that helps users manage their schedule efficiently.

Current Context:
- Today's date: ${today}
- User's current view: ${currentDate || today}
- Existing events today: ${events?.length || 0} events
- Pending todos: ${todos?.length || 0} tasks

Your capabilities:
1. Create calendar events (gym, meetings, appointments, work blocks, etc.)
2. Create todos/tasks
3. Help plan optimal daily schedules
4. Suggest time blocks for productivity

When helping create a "perfect day" or optimized schedule:
- Consider work-life balance
- Include time for: work, exercise, meals, breaks, personal time
- Allow buffer time between activities
- Suggest realistic time blocks (e.g., gym: 60-90 min, meals: 30-60 min)

Example daily structure:
- Morning routine (30-60 min after waking)
- Exercise/gym (60-90 min)
- Work blocks (2-3 hour focused sessions with breaks)
- Lunch (60 min)
- Afternoon work
- Evening activities/personal time

Always confirm dates and times with the user before creating events. Use 24-hour format for times internally (e.g., 14:00 for 2 PM).

Be friendly, efficient, and help users make the most of their time!`,
    tools: {
      create_event: tool({
        description: 'Create a calendar event with date, time, title, and description',
        inputSchema: z.object({
          title: z.string().describe('The title of the event (e.g., "Gym", "Meeting with client", "Lunch")'),
          description: z.string().optional().describe('Optional description or notes about the event'),
          date: z.string().describe('The date in YYYY-MM-DD format'),
          start_time: z.string().describe('Start time in HH:MM format (24-hour, e.g., "09:00" for 9 AM, "14:30" for 2:30 PM)'),
          end_time: z.string().optional().describe('End time in HH:MM format (24-hour)'),
        }),
        execute: async (args) => {
          const eventData: CalendarEvent = {
            title: args.title,
            description: args.description || null,
            event_date: args.date,
            start_time: args.start_time || null,
            end_time: args.end_time || null,
            user_id: userId,
          };
          return await createCalendarEvent(eventData);
        },
      }),
      create_todo: tool({
        description: 'Create a todo/task item',
        inputSchema: z.object({
          title: z.string().describe('The task title'),
          description: z.string().optional().describe('Optional task description'),
          due_date: z.string().optional().describe('Optional due date in YYYY-MM-DD format'),
        }),
        execute: async (args) => {
          const todoData: Todo = {
            title: args.title,
            description: args.description || null,
            due_date: args.due_date || null,
            user_id: userId,
            completed: false,
          };
          return await createTodo(todoData);
        },
      }),
    },
    maxOutputTokens: 1500,
    temperature: 0.7,
  });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('❌ Calendar chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
