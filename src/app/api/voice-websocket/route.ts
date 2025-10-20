import { WebSocket } from 'ws';
import { updatePhoneCall, createCalendarEvent } from '@/lib/db-operations';
import type { CalendarEvent } from '@/lib/types';

export const runtime = 'nodejs';

// OpenAI Realtime API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REALTIME_API_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
const USER_ID = process.env.USER_ID;

// System instructions for the AI
const SYSTEM_INSTRUCTIONS = `You are Jorge's AI assistant calling to schedule an interview meeting.

Your greeting: "Hi, I'm George Assistant, and I'm here to schedule an interview with you. Let's start."

Your role:
1. Greet the person warmly with the greeting above
2. Ask when they would be available for a meeting with Jorge
3. Suggest some available time slots (weekdays 9 AM - 5 PM)
4. Confirm the date and time
5. Use the book_meeting tool to schedule it
6. Confirm the booking and thank them

Guidelines:
- Be friendly, professional, and concise
- Speak naturally like a human assistant
- If they're busy, offer to call back later
- Keep the call under 2 minutes if possible
- Today's date is ${new Date().toISOString().split('T')[0]}

Available function:
- book_meeting: Books a meeting in Jorge's calendar
`;

interface StreamParameters {
  leadId?: string;
  leadName?: string;
}

export async function POST(req: Request) {
  try {
    const upgradeHeader = req.headers.get('upgrade');

    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // In production, you'd handle WebSocket upgrade here
    // For Vercel/Next.js, we need a different approach

    return new Response(
      'WebSocket endpoint - use Twilio Media Streams to connect',
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error in voice WebSocket:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// This will be called by Twilio's WebSocket connection
export async function handleTwilioWebSocket(twilioWs: WebSocket, params: StreamParameters) {
  console.log('🎤 New Twilio WebSocket connection');

  let openAiWs: WebSocket | null = null;
  let callSid = '';
  let streamSid = '';
  const { leadId } = params;
  let transcript = '';
  let meetingScheduled = false;

  try {
    // Connect to OpenAI Realtime API
    openAiWs = new WebSocket(REALTIME_API_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    // OpenAI connection opened
    openAiWs.on('open', () => {
      console.log('✅ Connected to OpenAI Realtime API');

      // Configure the session
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: SYSTEM_INSTRUCTIONS,
          voice: 'alloy',
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: [
            {
              type: 'function',
              name: 'book_meeting',
              description: 'Books a meeting in the calendar after confirming date and time with the person',
              parameters: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    description: 'Meeting date in YYYY-MM-DD format',
                  },
                  time: {
                    type: 'string',
                    description: 'Meeting start time in HH:MM format (24-hour)',
                  },
                  duration_minutes: {
                    type: 'number',
                    description: 'Duration of the meeting in minutes (default 60)',
                  },
                },
                required: ['date', 'time'],
              },
            },
          ],
        },
      };

      openAiWs?.send(JSON.stringify(sessionConfig));
      console.log('📤 Sent session configuration to OpenAI');
    });

    // Handle messages from OpenAI
    openAiWs.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle different message types
        switch (message.type) {
          case 'session.created':
            console.log('✅ OpenAI session created');
            break;

          case 'response.audio.delta':
            // Forward audio from OpenAI to Twilio
            if (streamSid && message.delta) {
              const audioMessage = {
                event: 'media',
                streamSid,
                media: {
                  payload: message.delta,
                },
              };
              twilioWs.send(JSON.stringify(audioMessage));
            }
            break;

          case 'response.audio_transcript.delta':
            // Collect transcript
            if (message.delta) {
              transcript += message.delta;
            }
            break;

          case 'response.function_call_arguments.done':
            // Handle function calls
            if (message.name === 'book_meeting') {
              try {
                const args = JSON.parse(message.arguments);
                await handleBookMeeting(args, leadId || undefined);
                meetingScheduled = true;

                // Send response back to OpenAI
                const functionResult = {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: message.call_id,
                    output: JSON.stringify({
                      success: true,
                      message: 'Meeting scheduled successfully',
                    }),
                  },
                };
                openAiWs?.send(JSON.stringify(functionResult));
              } catch (error) {
                console.error('Error handling book_meeting:', error);
              }
            }
            break;

          case 'error':
            console.error('OpenAI error:', message.error);
            break;
        }
      } catch (error) {
        console.error('Error processing OpenAI message:', error);
      }
    });

    // Handle messages from Twilio
    twilioWs.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.event) {
          case 'connected':
            console.log('📞 Twilio connected');
            break;

          case 'start':
            console.log('▶️  Call started');
            callSid = message.start.callSid;
            streamSid = message.start.streamSid;

            // Update call status
            updatePhoneCall(callSid, { status: 'in-progress' }).catch(console.error);
            break;

          case 'media':
            // Forward audio from Twilio to OpenAI
            if (openAiWs?.readyState === WebSocket.OPEN && message.media?.payload) {
              const audioAppend = {
                type: 'input_audio_buffer.append',
                audio: message.media.payload,
              };
              openAiWs.send(JSON.stringify(audioAppend));
            }
            break;

          case 'stop':
            console.log('⏹️  Call ended');
            // Update final call status
            updatePhoneCall(callSid, {
              status: 'completed',
              transcript: transcript || null,
              meeting_scheduled: meetingScheduled,
            }).catch(console.error);

            // Close OpenAI connection
            if (openAiWs) {
              openAiWs.close();
            }
            break;
        }
      } catch (error) {
        console.error('Error processing Twilio message:', error);
      }
    });

    // Handle errors
    twilioWs.on('error', (error) => {
      console.error('❌ Twilio WebSocket error:', error);
      if (callSid) {
        updatePhoneCall(callSid, {
          status: 'failed',
          error_message: error.message,
        }).catch(console.error);
      }
    });

    openAiWs.on('error', (error) => {
      console.error('❌ OpenAI WebSocket error:', error);
    });

    // Handle close
    twilioWs.on('close', () => {
      console.log('📴 Twilio connection closed');
      if (openAiWs) {
        openAiWs.close();
      }
    });

    openAiWs.on('close', () => {
      console.log('📴 OpenAI connection closed');
    });

  } catch (error) {
    console.error('❌ Error setting up WebSocket bridge:', error);
    if (callSid) {
      updatePhoneCall(callSid, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      }).catch(console.error);
    }
  }
}

// Helper function to book a meeting
async function handleBookMeeting(args: { date: string; time: string; duration_minutes?: number }, leadId?: string) {
  console.log('📅 Booking meeting:', args);

  const durationMinutes = args.duration_minutes || 60;
  const startTime = args.time;

  // Calculate end time
  const [hours, minutes] = startTime.split(':').map(Number);
  const endMinutes = minutes + durationMinutes;
  const endHours = hours + Math.floor(endMinutes / 60);
  const endTime = `${String(endHours % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

  const eventData: CalendarEvent = {
    title: 'Interview Meeting',
    description: leadId ? `Lead ID: ${leadId}` : 'Scheduled via AI call',
    event_date: args.date,
    start_time: startTime,
    end_time: endTime,
    user_id: USER_ID || '',
  };

  const result = await createCalendarEvent(eventData);

  if (result.success) {
    console.log('✅ Meeting booked successfully:', result.data);

    // Update the phone call with meeting details
    // (callSid would need to be accessible here)
  } else {
    console.error('❌ Failed to book meeting:', result.error);
    throw new Error('Failed to book meeting');
  }

  return result;
}
