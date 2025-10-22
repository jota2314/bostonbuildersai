# Twilio Voice Setup Guide

This guide will help you set up the browser-based calling feature with AI transcription and recording.

## 🔑 Required Environment Variables

Add these to your `.env.local` file:

```bash
# Existing Twilio variables (you should already have these)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# NEW: Twilio API Credentials for Voice SDK
TWILIO_API_KEY=your_api_key_sid
TWILIO_API_SECRET=your_api_secret

# NEW: TwiML App SID
TWILIO_TWIML_APP_SID=your_twiml_app_sid

# App URL (should already exist)
NEXT_PUBLIC_APP_URL=https://bostonbuildersai.vercel.app
```

## 📋 Setup Steps

### Step 1: Create Twilio API Key

1. Go to [Twilio Console > Account > API Keys](https://console.twilio.com/us1/develop/api-keys)
2. Click **Create API Key**
3. Name it: `Boston Builders Voice`
4. Key Type: `Standard`
5. Click **Create**
6. **IMPORTANT:** Copy the **SID** and **Secret** immediately (you won't see them again!)
   - `TWILIO_API_KEY` = SID
   - `TWILIO_API_SECRET` = Secret

### Step 2: Create TwiML Application

1. Go to [Twilio Console > Voice > TwiML Apps](https://console.twilio.com/us1/develop/voice/manage/twiml-apps)
2. Click **Create new TwiML App** or **+** button
3. **Friendly Name:** `Boston Builders Voice Client`
4. **Voice Configuration:**
   - **Request URL:** `https://bostonbuildersai.vercel.app/api/voice/make-call`
   - **HTTP Method:** `POST`
5. Leave other fields blank
6. Click **Save**
7. Copy the **SID** (starts with `AP...`)
   - `TWILIO_TWIML_APP_SID` = This SID

### Step 3: Configure Webhooks (Important for Recording & Transcription)

The system automatically sends webhooks to these endpoints:
- **Recording Complete:** `/api/voice/recording-complete`
- **Transcription Complete:** `/api/voice/transcription-complete`

These are configured in the `make-call` route automatically - no manual setup needed!

### Step 4: Add Environment Variables to Vercel

1. Go to [Vercel Dashboard > Your Project > Settings > Environment Variables](https://vercel.com/dashboard)
2. Add the three new variables:
   - `TWILIO_API_KEY`
   - `TWILIO_API_SECRET`
   - `TWILIO_TWIML_APP_SID`
3. Make sure they're available for **Production**, **Preview**, and **Development**
4. Click **Save**

### Step 5: Redeploy

After adding the environment variables, redeploy your app:
```bash
git push
```

Vercel will automatically redeploy with the new configuration.

## 🎯 How It Works

### User Flow:
1. Click **Call** button on lead detail page
2. Beautiful call interface appears with controls
3. Call connects to lead's phone number
4. You (Jorge) talk directly with the lead
5. AI listens in background, transcribing everything
6. Click **End Call** when done
7. AI generates summary and saves to Communications

### What Gets Saved:
- ✅ **Audio Recording** → Supabase Storage (`call-recordings` bucket)
- ✅ **Full Transcript** → `phone_calls` table
- ✅ **AI Summary** → Communications table (appears in Messages)
- ✅ **Call Duration** → Metadata

### Call Interface Features:
- 🔇 **Mute/Unmute** - Control your microphone
- 📢 **Speaker Toggle** - Switch audio output
- 📞 **End Call** - Hang up anytime
- ⏱️ **Live Timer** - See call duration

## 🧪 Testing

1. Open a lead detail page
2. Click the **Call** button
3. You should see the call interface
4. The call should connect to the lead's phone
5. After the call ends, check:
   - Communications tab for AI summary
   - Supabase Storage for audio file
   - `phone_calls` table for transcript

## ⚠️ Troubleshooting

### "Device not initialized" Error
- Check that all environment variables are set correctly
- Verify Vercel deployment includes the new env vars
- Check browser console for detailed errors

### Call Not Connecting
- Verify `TWILIO_TWIML_APP_SID` is correct
- Check TwiML App voice URL points to `/api/voice/make-call`
- Ensure lead has a valid phone number

### Recording Not Saving
- Check Supabase Storage bucket `call-recordings` exists
- Verify storage policies allow service role access
- Check webhook logs in Vercel for errors

### Transcript Not Appearing
- Twilio transcription can take 2-5 minutes after call ends
- Check `/api/voice/transcription-complete` logs
- Verify AI model has credits remaining

## 💰 Costs

- **Twilio Voice:** ~$0.013/min (outbound calls to US)
- **Recording Storage:** ~$0.0012/min
- **Transcription:** ~$0.05/min
- **Supabase Storage:** Included in free tier (up to 1GB)

Example: 10-minute call = ~$0.50 total

## 📞 Support

If you encounter issues, check:
1. Vercel deployment logs
2. Browser console (F12)
3. Twilio Console > Monitor > Logs
4. Supabase logs for storage/database errors
