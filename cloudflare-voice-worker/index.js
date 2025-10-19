/**
 * Cloudflare Worker for AI Voice Calling
 * Bridges Twilio Media Streams <-> OpenAI Realtime API
 */

const OPENAI_REALTIME_MODEL = 'gpt-4o-realtime-preview-2024-10-01';

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
- Today's date is {{TODAY_DATE}}

Available function:
- book_meeting: Books a meeting in Jorge's calendar
`;

export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');

    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Handle the WebSocket connection
    handleWebSocketSession(server, env);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  },
};

async function handleWebSocketSession(twilioWs, env) {
  twilioWs.accept();

  console.log('🎤 New Twilio WebSocket connection');

  let openAiWs = null;
  let callSid = '';
  let streamSid = '';
  let transcript = '';
  let meetingScheduled = false;
  let leadId = null;
  let leadName = 'there';

  try {
    // Connect to OpenAI Realtime API using subprotocols for authentication
    // This is the browser-compatible way that works in Cloudflare Workers
    const url = `wss://api.openai.com/v1/realtime?model=${OPENAI_REALTIME_MODEL}`;

    const protocols = [
      'realtime',
      `openai-insecure-api-key.${env.OPENAI_API_KEY}`,
      'openai-beta.realtime-v1'
    ];

    openAiWs = new WebSocket(url, protocols);

    // OpenAI connection handlers
    openAiWs.addEventListener('open', () => {
      console.log('✅ Connected to OpenAI Realtime API');

      // Configure the session
      // Get current date dynamically for each call
      const today = new Date().toISOString().split('T')[0];
      const instructions = SYSTEM_INSTRUCTIONS.replace('{{TODAY_DATE}}', today);

      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: instructions,
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

      openAiWs.send(JSON.stringify(sessionConfig));
      console.log('📤 Sent session configuration to OpenAI');
    });

    openAiWs.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);

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
                await handleBookMeeting(args, leadId, env);
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
                openAiWs.send(JSON.stringify(functionResult));
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

    // Twilio WebSocket handlers
    twilioWs.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.event) {
          case 'connected':
            console.log('📞 Twilio connected');
            break;

          case 'start':
            console.log('▶️  Call started');
            callSid = message.start.callSid;
            streamSid = message.start.streamSid;

            // Get custom parameters
            const params = message.start.customParameters || {};
            leadId = params.leadId || null;
            leadName = params.leadName || 'there';

            // Update call status in database
            await updatePhoneCall(callSid, { status: 'in-progress' }, env);
            break;

          case 'media':
            // Forward audio from Twilio to OpenAI
            if (openAiWs && openAiWs.readyState === WebSocket.OPEN && message.media?.payload) {
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
            await updatePhoneCall(callSid, {
              status: 'completed',
              transcript: transcript || null,
              meeting_scheduled: meetingScheduled,
            }, env);

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

    twilioWs.addEventListener('close', () => {
      console.log('📴 Twilio connection closed');
      if (openAiWs) {
        openAiWs.close();
      }
    });

    twilioWs.addEventListener('error', async (error) => {
      console.error('❌ Twilio WebSocket error:', error);
      if (callSid) {
        await updatePhoneCall(callSid, {
          status: 'failed',
          error_message: error.message || 'WebSocket error',
        }, env);
      }
    });

    openAiWs.addEventListener('close', () => {
      console.log('📴 OpenAI connection closed');
    });

    openAiWs.addEventListener('error', (error) => {
      console.error('❌ OpenAI WebSocket error:', error);
    });

  } catch (error) {
    console.error('❌ Error setting up WebSocket bridge:', error);
    if (callSid) {
      await updatePhoneCall(callSid, {
        status: 'failed',
        error_message: error.message || 'Unknown error',
      }, env);
    }
  }
}

// Helper function to book a meeting
async function handleBookMeeting(args, leadId, env) {
  console.log('📅 Booking meeting:', args);

  const durationMinutes = args.duration_minutes || 60;
  const startTime = args.time;

  // Calculate end time
  const [hours, minutes] = startTime.split(':').map(Number);
  const endMinutes = minutes + durationMinutes;
  const endHours = hours + Math.floor(endMinutes / 60);
  const endTime = `${String(endHours % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

  // Call your Next.js API to book the meeting
  const response = await fetch(`${env.NEXT_JS_API_URL}/api/book-meeting`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.API_SECRET_KEY}`,
    },
    body: JSON.stringify({
      leadId,
      date: args.date,
      startTime: startTime,
      endTime: endTime,
      userId: env.USER_ID,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to book meeting');
  }

  return await response.json();
}

// Helper function to update phone call in database
async function updatePhoneCall(callSid, updates, env) {
  try {
    await fetch(`${env.NEXT_JS_API_URL}/api/update-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.API_SECRET_KEY}`,
      },
      body: JSON.stringify({
        callSid,
        updates,
      }),
    });
  } catch (error) {
    console.error('Failed to update phone call:', error);
  }
}
