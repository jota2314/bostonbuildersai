/**
 * Cloudflare Worker for AI Voice Calling
 * Bridges Twilio Media Streams <-> OpenAI Realtime API
 */

const OPENAI_REALTIME_MODEL = 'gpt-4o-realtime-preview-2024-10-01';

const SYSTEM_INSTRUCTIONS = `You are Jorge's AI assistant at Boston Builders AI. You're calling to learn more about their business before their scheduled meeting with Jorge.

TODAY'S DATE: {{TODAY_DATE}}

===== IMPORTANT CONTEXT =====
This person just booked a meeting with Jorge! They already have an appointment scheduled. Your job is NOT to book another meeting - it's to gather valuable information to help Jorge prepare for the call.

===== YOUR MISSION =====
Ask discovery questions to understand their business better. This helps Jorge give them better advice on the scheduled call. You're gathering intel - think of it as pre-call research.

===== YOUR PERSONALITY =====
- Warm, friendly, and genuinely curious
- Like a helpful assistant preparing for an important meeting
- Natural conversational style - NOT a rigid script
- Keep it brief (2-3 minute call max)
- If they're busy, respect their time - you can skip to SMS

===== CALL FLOW =====

GREETING (Keep it SHORT):
"Hey [name]! This is Jorge's assistant from Boston Builders AI. I see you just booked a meeting with him - awesome! I have a couple quick questions to help Jorge prep for your call. Got a minute?"

IF THEY SAY NO / ARE BUSY:
"No worries! I'll send you a quick text with a few questions instead. Sound good?"
Then use the save_discovery_info tool to mark that you'll follow up via SMS.

IF THEY SAY YES:
Ask these discovery questions naturally (NOT in a robotic list):

1. **Website question:**
   "Do you currently have a website for your business?"
   → If yes: "Great! What's the URL?"
   → If no: "No problem, just curious!"

2. **Services question:**
   "What specific services or features are you most interested in? Like CRM, lead tracking, estimating tools, that kind of thing?"
   → Listen and note what they mention

3. **Pain points question:**
   "What's the biggest challenge you're facing right now with managing your business?"
   OR
   "What's driving you to look for better software?"
   → This is GOLD - really listen here

4. **Additional struggles:**
   "Is there anything else that's been frustrating about your current systems?"
   → Optional - only if conversation flows naturally

WRAPPING UP:
"Perfect! This is super helpful for Jorge. He's going to have some great ideas for you on the call. Looking forward to it!"

THEN SAVE EVERYTHING:
Use the save_discovery_info tool with all the information you gathered.

===== IMPORTANT RULES =====

DO NOT:
- Book another meeting (they already have one!)
- Ask for their name (you already have it!)
- Rush them through questions
- Sound like a survey or telemarketer

DO:
- Keep it conversational and natural
- If they want to elaborate, let them talk!
- Show genuine interest in their answers
- Keep the whole call under 3 minutes
- Save ALL discovery info using the tool before ending

HANDLING QUESTIONS:
If they ask about Boston Builders AI:
- "Jorge will cover all that in detail on your call! But quick answer - we build custom software for contractors. You own everything, not shared SaaS."
- Keep answers SHORT - the meeting is where they'll learn more

Remember: You're gathering intel to make Jorge's meeting more valuable. Every detail helps!
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
              name: 'save_discovery_info',
              description: 'Save all discovery information gathered from the call to help Jorge prepare for the meeting',
              parameters: {
                type: 'object',
                properties: {
                  has_website: {
                    type: 'boolean',
                    description: 'Whether they have a website',
                  },
                  website_url: {
                    type: 'string',
                    description: 'Their website URL if they have one',
                  },
                  services_interested: {
                    type: 'string',
                    description: 'Services/features they are interested in (CRM, lead tracking, estimating, etc.)',
                  },
                  pain_points: {
                    type: 'string',
                    description: 'Main challenges or pain points they mentioned',
                  },
                  additional_notes: {
                    type: 'string',
                    description: 'Any other important information or context from the conversation',
                  },
                  will_follow_up_sms: {
                    type: 'boolean',
                    description: 'Set to true if the person was busy and you said you would follow up via SMS instead',
                  },
                },
                required: [],
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
            if (message.name === 'save_discovery_info') {
              try {
                const args = JSON.parse(message.arguments);
                await handleSaveDiscoveryInfo(args, leadId, callSid, transcript, env);
                meetingScheduled = false; // Not booking, just gathering info

                // Send response back to OpenAI
                const functionResult = {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: message.call_id,
                    output: JSON.stringify({
                      success: true,
                      message: 'Discovery information saved successfully',
                    }),
                  },
                };
                openAiWs.send(JSON.stringify(functionResult));
              } catch (error) {
                console.error('Error handling save_discovery_info:', error);
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

// Helper function to save discovery information
async function handleSaveDiscoveryInfo(args, leadId, callSid, transcript, env) {
  console.log('💾 Saving discovery info:', args);

  if (!leadId) {
    console.warn('⚠️ No lead ID provided, skipping save');
    return { success: false, message: 'No lead ID' };
  }

  // Build discovery notes
  const discoveryNotes = [];

  if (args.has_website !== undefined) {
    discoveryNotes.push(`Website: ${args.has_website ? args.website_url || 'Yes' : 'No'}`);
  }

  if (args.services_interested) {
    discoveryNotes.push(`Interested in: ${args.services_interested}`);
  }

  if (args.pain_points) {
    discoveryNotes.push(`Pain Points: ${args.pain_points}`);
  }

  if (args.additional_notes) {
    discoveryNotes.push(`Additional: ${args.additional_notes}`);
  }

  if (args.will_follow_up_sms) {
    discoveryNotes.push(`Status: Will follow up via SMS`);
  }

  const notesText = discoveryNotes.length > 0
    ? `\n\n📞 Discovery Call Notes:\n${discoveryNotes.join('\n')}`
    : '';

  // Call Next.js API to save discovery info
  const response = await fetch(`${env.NEXT_JS_API_URL}/api/save-discovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.API_SECRET_KEY}`,
    },
    body: JSON.stringify({
      leadId,
      callSid,
      discoveryNotes: notesText,
      transcript: transcript || null,
      willFollowUpSms: args.will_follow_up_sms || false,
    }),
  });

  if (!response.ok) {
    console.error('❌ Failed to save discovery info');
    throw new Error('Failed to save discovery information');
  }

  const result = await response.json();
  console.log('✅ Discovery info saved successfully');
  return result;
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
