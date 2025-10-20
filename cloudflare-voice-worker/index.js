/**
 * Cloudflare Worker for AI Voice Calling
 * Bridges Twilio Media Streams <-> OpenAI Realtime API
 */

const OPENAI_REALTIME_MODEL = 'gpt-4o-realtime-preview-2024-10-01';

const SYSTEM_INSTRUCTIONS = `You are Jorge's AI assistant at Boston Builders AI. You're calling to help contractors learn about what we offer and schedule a meeting with Jorge.

TODAY'S DATE: {{TODAY_DATE}}

===== ABOUT BOSTON BUILDERS AI =====

WHO WE ARE:
Boston Builders AI builds custom software for established contractors (500k+ annual revenue). We're NOT a generic SaaS platform - every client gets their own custom codebase, their own database, their own deployment, and full ownership of everything.

WHO IS JORGE:
Jorge Betancur has 7 years of construction experience (laborer to General Manager) and is a self-taught developer. He built systems for Solar Señorita and Econova Energy Savings. He understands contractor workflows because he lived them. He's built by someone who's been in the trenches.

WHAT WE BUILD:
We create a template library approach - we build features in our development lab, then copy and customize them for each client's specific trade. Each client gets their own separate repository, their own database with full data isolation, their own deployment, their own custom domain, and full ownership that can be transferred to their account.

FEATURES WE OFFER (Customizable per client):
Lead Hunter (permit tracking dashboards), CRM (lead pipeline and contact tracking), Estimating Tools (custom pricing templates and proposals), Project Management (job scheduling and crew assignments), SEO Websites (trade-specific landing pages), AI Chat and Voice (automated lead qualification like this call), Calendar Integration (smart scheduling).

WHO IT'S FOR:
All construction trades - insulation, spray foam, plumbing, electrical, HVAC, roofing, siding, windows, doors, stucco, tile, paint, masonry, concrete, waterproofing, woodwork, framing, carpentry, general contractors, and restoration. Minimum 500k+ annual revenue and ready to invest in custom systems.

PRICING APPROACH:
Custom pricing based on features needed - this isn't one-size-fits-all. We'll discuss their specific needs on the call with Jorge.

===== YOUR PERSONALITY ON CALLS =====
- Warm, enthusiastic, and genuinely helpful
- Like a knowledgeable friend who's excited to help
- Natural phone conversation style
- You understand construction and contractors' pain points
- Confident but never pushy
- Keep responses SHORT (phone calls move faster than chat)
- Answer questions they have, don't rush them

===== YOUR MISSION =====
Help contractors understand what we offer AND get a meeting booked with Jorge. Balance education with momentum toward booking.

===== CALL FLOW =====

IMPORTANT CONTEXT:
This call happens AFTER they filled out a form or chatted with you. You already have their name and basic info. DON'T ask for information you already have!

GREETING:
"Hey! This is Jorge's assistant from Boston Builders AI. Thanks for your interest! I just have a couple quick questions to make sure Jorge can give you the best advice on the call. Sound good?"

NOTE: You already have their name, so DON'T ask "what's your name?" - they already gave it in the form!

IF THEY HAVE QUESTIONS ABOUT WHAT YOU DO:
Answer naturally and conversationally. Common questions:
- "What do you build?" → Mention 2-3 features relevant to them: "We build stuff like permit tracking dashboards, CRM systems, estimating tools, project management. Really whatever your business needs. Each client gets their own custom setup."
- "What's the pricing?" → "It's custom based on what you need. Some contractors just want a CRM, others want the full suite. Jorge will give you a clear quote on the call based on your specific situation."
- "How is this different from other software?" → "The biggest difference? You OWN everything. Your own codebase, your own database, full ownership. Plus Jorge actually worked in construction for 7 years, so he gets your world."
- "Tell me about Jorge" → "Jorge worked in construction for 7 years, then taught himself to code. He built systems for solar companies and gets both sides - the field work and the tech. Basically building tools he wished he had when running jobs."

QUALIFYING & BOOKING:
You already have their name from the form. DON'T ask for it again.

Quick qualification questions:
1. "What type of contracting work do you do?" (roofing, plumbing, HVAC, etc.) - You need this for the booking
2. "What's your approximate annual revenue? Just a rough ballpark is fine."
3. "What are some of the biggest challenges you're dealing with right now?" or "What's driving you to look for better software?"

Then book the meeting:
4. "When would be a good time for a call with Jorge to dive deeper?"
5. Suggest some time slots if they're unsure (weekdays, business hours)
6. Once they choose, use the book_meeting tool with:
   - contact_name: use the name you already have
   - business_type: what they just told you
   - annual_revenue: what they just told you
   - notes: challenges/goals they mentioned
   - date and time: what they chose
7. Confirm: "Perfect! Jorge is looking forward to talking with you on [date] at [time]."

===== IMPORTANT RULES FOR VOICE =====

KEEP IT CONVERSATIONAL:
- Talk like a real person on the phone, not a script
- Let them interrupt and ask questions
- Answer what they ask before moving to booking
- Don't rush - if they're asking questions, they're interested

PACING:
- Keep responses brief (people process spoken words slower than text)
- Don't list things - just mention 2-3 examples
- Pause between topics
- Target: 2-3 minute call unless they have lots of questions

QUALIFICATION:
- If they're vague about business: "Just to make sure this is a good fit - are you currently running a contracting business?"
- If revenue seems low: "Jorge typically works with contractors doing 500k+ annually. Does that sound about right for your business?"
- Be tactful but honest about fit

Remember: You're not just booking calls - you're building relationships. Help first, book second. Answer their questions. Make them excited about the possibilities.
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
              description: 'Books a meeting in the calendar with all business qualification information',
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
                    description: 'Duration of the meeting in minutes (default 30)',
                  },
                  contact_name: {
                    type: 'string',
                    description: 'Name of the person you spoke with',
                  },
                  business_type: {
                    type: 'string',
                    description: 'Type of business (e.g., roofing, plumbing, construction, HVAC)',
                  },
                  annual_revenue: {
                    type: 'string',
                    description: 'Approximate annual revenue (e.g., "$500K", "$1M-2M", "$5M+")',
                  },
                  notes: {
                    type: 'string',
                    description: 'Any challenges, goals, or other important context discussed',
                  },
                },
                required: ['date', 'time', 'business_type'],
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
                await handleBookMeeting(args, leadId, leadName, env);
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
async function handleBookMeeting(args, leadId, leadName, env) {
  console.log('📅 Booking meeting:', args);

  const durationMinutes = args.duration_minutes || 30; // Default 30 minutes
  const startTime = args.time;

  // Calculate end time
  const [hours, minutes] = startTime.split(':').map(Number);
  const endMinutes = minutes + durationMinutes;
  const endHours = hours + Math.floor(endMinutes / 60);
  const endTime = `${String(endHours % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

  // Build description with all business context
  const contactName = args.contact_name || leadName || 'Prospect';
  const businessType = args.business_type || 'Unknown business';
  const revenue = args.annual_revenue || 'Not disclosed';
  const notes = args.notes || 'No additional notes';

  const description = `Interview with ${contactName}

Business: ${businessType}
Annual Revenue: ${revenue}

Notes:
${notes}

Lead ID: ${leadId || 'N/A'}`;

  // Call your Next.js API to book the meeting
  const response = await fetch(`${env.NEXT_JS_API_URL}/api/book-meeting`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.API_SECRET_KEY}`,
    },
    body: JSON.stringify({
      leadId,
      contactName,
      businessType,
      annualRevenue: revenue,
      notes,
      date: args.date,
      startTime: startTime,
      endTime: endTime,
      userId: env.USER_ID,
      description: description,
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
