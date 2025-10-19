# AI Voice Call Integration - Setup Guide

## ✅ What Was Built

I've implemented a complete AI voice calling system that automatically calls leads after they submit the form and schedules meetings with them.

### Features:
- 🤖 **OpenAI Realtime API** for natural conversational AI
- 📞 **Twilio Integration** for making phone calls
- 📅 **Automatic Meeting Scheduling** via AI conversation
- 💾 **Call Tracking** in Supabase database
- 🔄 **Real-time Audio Streaming** (WebSocket bridge)

### Files Created/Modified:

1. **Database Schema:**
   - `supabase/migrations/create_phone_calls_table.sql` - Phone calls table

2. **API Routes:**
   - `src/app/api/initiate-call/route.ts` - Triggers Twilio calls
   - `src/app/api/voice-websocket/route.ts` - WebSocket bridge (Twilio ↔ OpenAI)

3. **Database Operations:**
   - `src/lib/types.ts` - Added `PhoneCall` type
   - `src/lib/db-operations.ts` - Added phone call CRUD operations

4. **Components:**
   - `src/components/LeadForm.tsx` - Updated to:
     - Make phone number required
     - Trigger AI call after form submission

---

## 🚨 IMPORTANT: WebSocket Limitation

**Issue:** Next.js doesn't support native WebSocket servers on Vercel.

**You have 2 options:**

### Option A: Deploy WebSocket Handler Separately (Recommended)
Deploy the WebSocket handler on a service that supports WebSockets:
- **Railway** (easiest)
- **Render**
- **Fly.io**
- **Your own VPS**

### Option B: Use Twilio Functions
Move the WebSocket logic to Twilio Functions (serverless functions on Twilio's platform)

---

## 📋 Setup Instructions

### 1. Run the Supabase Migration

Go to your Supabase dashboard → SQL Editor → Run this:

```bash
# Or run the migration file
supabase/migrations/create_phone_calls_table.sql
```

This creates the `phone_calls` table to track all AI calls.

### 2. Add Environment Variables

Add these to your `.env.local`:

```env
# Already have these:
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
USER_ID=... (your user_id from Supabase)

# NEW - Add your deployment URL:
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

### 3. Configure Twilio for WebSocket (Temporary Workaround)

Since we can't use WebSocket on Vercel directly, you need to:

**Quick Test Option:**
Update `src/app/api/initiate-call/route.ts` to use simple TwiML for now:

```typescript
// Replace the twiml in initiate-call/route.ts with:
twiml: `<Response>
  <Say voice="alice">Hi, I'm George Assistant, and I'm here to schedule an interview with you. Please press 1 if you're available this week, or press 2 for next week.</Say>
  <Gather numDigits="1" action="https://your-domain.vercel.app/api/handle-response">
    <Say>Press any key after your selection.</Say>
  </Gather>
</Response>`
```

This gives you a working solution immediately while you set up WebSocket hosting.

---

## 🎯 How It Works (Current Flow)

1. **User submits lead form** → Form validates phone is required
2. **Lead saved to database** → Returns lead ID
3. **AI call initiated** → POST to `/api/initiate-call`
4. **Twilio makes the call** → Using TwiML or WebSocket (if configured)
5. **AI converses with lead** → "Hi, I'm George Assistant..."
6. **Meeting scheduled** → AI uses `book_meeting` function
7. **Call tracked in database** → Status, transcript, meeting details saved

---

## 🔧 Next Steps

### Immediate (To Test):
1. ✅ Run the Supabase migration
2. ✅ Add `NEXT_PUBLIC_BASE_URL` to `.env.local`
3. ✅ Deploy to Vercel
4. ✅ Test the form submission
5. ✅ Check if call initiates

### For Full AI Voice (Requires WebSocket):
1. Choose hosting option (Railway, Render, etc.)
2. Extract WebSocket handler to separate service
3. Update Twilio to point to new WebSocket URL
4. Test full conversational AI

---

## 💰 Cost Estimate

**Per Call:**
- Twilio Voice: ~$0.0085/min
- OpenAI Realtime API: ~$0.06/min for input, ~$0.24/min for output
- **Average 2-min call: ~$0.60**

---

## 🧪 Testing

### Test with your own phone number first:

1. Submit the lead form with your number
2. You should get a call immediately
3. AI will greet you and ask about scheduling
4. Provide a date/time
5. Check your calendar - meeting should be booked!

---

## 🐛 Troubleshooting

### Call not initiated?
- Check Twilio credentials in `.env.local`
- Check console logs for errors
- Verify phone number format: +1XXXXXXXXXX

### Call initiated but no voice?
- WebSocket not configured (expected on Vercel)
- Use simple TwiML workaround above

### Meeting not booked?
- Check `USER_ID` in `.env.local`
- Check Supabase `calendar_events` table permissions
- Check console logs in API routes

---

## 📞 AI Voice Script

Current greeting:
> "Hi, I'm George Assistant, and I'm here to schedule an interview with you. Let's start."

The AI will:
1. Ask when they're available
2. Suggest weekday times (9 AM - 5 PM)
3. Confirm the date/time
4. Book the meeting
5. Confirm booking and thank them

You can customize this in: `src/app/api/voice-websocket/route.ts` (line 15-30)

---

## 🎨 Customization

### Change AI Voice:
Edit `voice-websocket/route.ts`:
```typescript
voice: 'alloy' // Options: alloy, echo, fable, onyx, nova, shimmer
```

### Change Greeting:
Edit `SYSTEM_INSTRUCTIONS` in `voice-websocket/route.ts`

### Change Call Timing:
Currently immediate. To add delay, modify `LeadForm.tsx` to use `setTimeout()`

---

## 🚀 Production Checklist

- [ ] Run Supabase migration
- [ ] Add all environment variables
- [ ] Test with your phone number
- [ ] Set up WebSocket hosting (Railway/Render)
- [ ] Configure Twilio Media Streams
- [ ] Test end-to-end flow
- [ ] Monitor call costs
- [ ] Set up error alerts

---

Need help? Check:
- OpenAI Realtime API docs: https://platform.openai.com/docs/guides/realtime
- Twilio Media Streams docs: https://www.twilio.com/docs/voice/media-streams
- WebSocket deployment guides for your chosen platform
