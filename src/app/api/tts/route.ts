import { OpenAI } from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response('Missing or invalid text', { status: 400 });
    }

    // Use OpenAI TTS API to convert text to speech
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1', // Fast model (use 'tts-1-hd' for higher quality)
      voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text,
      speed: 1.0,
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3Response.arrayBuffer());

    // Return the audio as MP3
    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return new Response('Error generating speech', { status: 500 });
  }
}
