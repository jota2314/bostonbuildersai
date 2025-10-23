import { NextRequest, NextResponse } from 'next/server';
import { openai, models } from '@/lib/ai/provider';
import { generateText } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const { action, draft, messageType, leadName, conversationHistory } = await req.json();

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'suggest') {
      // Generate response suggestions based on conversation context
      systemPrompt = `You are an AI assistant helping a sales professional (Jorge) respond to a potential customer.

Generate 3 different professional response suggestions. Each should:
- Be appropriate for ${messageType === 'sms' ? 'SMS (keep under 160 chars)' : 'email'}
- Sound natural and friendly
- Address the customer's likely concerns
- Include a clear next step or call-to-action

Recent conversation context:
${conversationHistory.map((msg: { direction: string; body: string }) =>
  `${msg.direction === 'inbound' ? leadName : 'Jorge'}: ${msg.body}`
).join('\n')}

IMPORTANT: Return ONLY a raw JSON array. Do NOT use markdown code blocks. Do NOT use backticks. Just the array.
Example format: ["suggestion 1", "suggestion 2", "suggestion 3"]`;

      userPrompt = `Generate 3 professional response suggestions for ${leadName}.`;

    } else if (action === 'improve') {
      // Improve the user's draft
      systemPrompt = `You are an AI writing assistant helping improve professional ${messageType} messages.

Improve this draft to be:
- More professional and polished
- Clear and concise
- Friendly but businesslike
- ${messageType === 'sms' ? 'Under 160 characters if possible' : 'Well-formatted for email'}

Keep the core message the same, just make it better. Return ONLY the improved text, nothing else.`;

      userPrompt = `Improve this ${messageType} to ${leadName}:\n\n${draft}`;

    } else if (action === 'professional') {
      // Make the draft more professional
      systemPrompt = `You are an AI writing assistant helping make messages more professional and polished.

Rewrite this message to be:
- More formal and professional
- Clear, concise, and well-structured
- Appropriate for business communication
- ${messageType === 'sms' ? 'Concise (aim for under 160 chars)' : 'Properly formatted for email'}

Maintain the original intent but elevate the tone. Return ONLY the rewritten text, nothing else.`;

      userPrompt = `Make this ${messageType} to ${leadName} more professional:\n\n${draft}`;
    }

    const result = await generateText({
      model: openai(models.default),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    let responseData;

    if (action === 'suggest') {
      // Parse JSON array for suggestions
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanedText = result.text.trim();

        // Remove ```json and ``` markers
        cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
        cleanedText = cleanedText.trim();

        const suggestions = JSON.parse(cleanedText);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          responseData = { success: true, suggestions: suggestions.slice(0, 3) };
        } else {
          // Fallback: split by newlines if not valid array
          const lines = result.text
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('```') && !l.startsWith('[') && !l.startsWith(']'))
            .slice(0, 3);

          responseData = { success: true, suggestions: lines.length > 0 ? lines : ['Error generating suggestions'] };
        }
      } catch {
        // Fallback: split by newlines and clean up
        const lines = result.text
          .split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('```') && !l.startsWith('[') && !l.startsWith(']') && !l.startsWith('"'))
          .slice(0, 3);

        responseData = { success: true, suggestions: lines.length > 0 ? lines : ['Error generating suggestions'] };
      }
    } else {
      // For improve/professional, return single text
      responseData = { success: true, text: result.text.trim() };
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in AI writing assistant:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate AI suggestions' },
      { status: 500 }
    );
  }
}
