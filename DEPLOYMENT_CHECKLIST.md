# AI Voice Calling - Deployment Checklist

Follow these steps in order to deploy your AI voice calling system with Cloudflare!

## ✅ Prerequisites

- [ ] Cloudflare account (free) - [Sign up](https://dash.cloudflare.com/sign-up)
- [ ] OpenAI API key with Realtime API access
- [ ] Twilio account with phone number
- [ ] Supabase database (already set up ✅)
- [ ] Vercel deployment (or ready to deploy)

---

## 📋 Step-by-Step Deployment

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

- [ ] Wrangler installed

### Step 2: Login to Cloudflare

```bash
wrangler login
```

- [ ] Logged in to Cloudflare

### Step 3: Generate API Secret Key

**Mac/Linux:**
```bash
openssl rand -base64 32
```

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

- [ ] API secret generated
- [ ] Secret copied to clipboard

### Step 4: Update Next.js Environment Variables

Add to `.env.local`:

```env
API_SECRET_KEY=YOUR_SECRET_FROM_STEP_3
CLOUDFLARE_WORKER_URL=wss://boston-builders-voice-ai.YOUR-NAME.workers.dev
```

- [ ] `API_SECRET_KEY` added to `.env.local`
- [ ] File saved

### Step 5: Deploy Cloudflare Worker

```bash
cd cloudflare-voice-worker
npm install
```

Set secrets:

```bash
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key

wrangler secret put USER_ID
# Paste your Supabase user_id from .env.local

wrangler secret put NEXT_JS_API_URL
# Enter: https://your-app.vercel.app (your deployed URL)

wrangler secret put API_SECRET_KEY
# Paste the secret from Step 3
```

Deploy:

```bash
wrangler deploy
```

- [ ] Worker deployed
- [ ] Worker URL copied (e.g., `https://boston-builders-voice-ai.YOUR-NAME.workers.dev`)

### Step 6: Update Worker URL in Code

Edit `src/app/api/initiate-call/route.ts` line 35:

Replace:
```typescript
const wsUrl = process.env.CLOUDFLARE_WORKER_URL || 'wss://boston-builders-voice-ai.YOUR-NAME.workers.dev';
```

With your actual Worker URL from Step 5.

Or add to `.env.local`:
```env
CLOUDFLARE_WORKER_URL=wss://your-actual-worker-url.workers.dev
```

- [ ] Worker URL updated

### Step 7: Deploy to Vercel

```bash
git add .
git commit -m "Add AI voice calling with Cloudflare"
git push
```

- [ ] Pushed to GitHub
- [ ] Vercel auto-deployed
- [ ] Environment variables synced in Vercel dashboard

### Step 8: Test!

1. Go to your landing page
2. Fill out the lead form
3. Use YOUR phone number for testing
4. Submit
5. Wait for call (should be immediate!)

- [ ] Form submitted
- [ ] Call received
- [ ] AI spoke greeting
- [ ] Scheduled a meeting
- [ ] Meeting appears in calendar

---

## 🐛 Debugging Checklist

If something doesn't work:

### No call received?

- [ ] Check Twilio dashboard for call logs
- [ ] Check browser console for errors
- [ ] Verify phone number format: +1XXXXXXXXXX
- [ ] Check `/api/initiate-call` logs in Vercel

### Call received but no voice?

- [ ] Run `wrangler tail` to see Worker logs
- [ ] Check if Worker is receiving connection
- [ ] Verify `OPENAI_API_KEY` is set: `wrangler secret list`
- [ ] Check OpenAI API key has Realtime API access

### AI speaks but meeting not booking?

- [ ] Check Worker logs: `wrangler tail`
- [ ] Verify `NEXT_JS_API_URL` is correct in Worker
- [ ] Verify `API_SECRET_KEY` matches in both places
- [ ] Check `/api/book-meeting` logs in Vercel
- [ ] Check `USER_ID` is set correctly

### Call status not updating?

- [ ] Check `/api/update-call` logs in Vercel
- [ ] Verify `API_SECRET_KEY` matches
- [ ] Check Supabase `phone_calls` table

---

## 📊 Monitoring

### View Worker Logs (Real-time):

```bash
cd cloudflare-voice-worker
wrangler tail
```

Keep this running while testing!

### Check Cloudflare Dashboard:

1. [dash.cloudflare.com](https://dash.cloudflare.com)
2. Workers & Pages
3. Click `boston-builders-voice-ai`
4. View metrics

### Check Vercel Logs:

1. Vercel dashboard
2. Your project
3. Logs tab
4. Filter by `/api/book-meeting` or `/api/update-call`

---

## 💰 Cost Tracking

### Cloudflare: FREE ✅
- 100,000 requests/day
- Unlimited WebSocket

### OpenAI:
- ~$0.60 per 2-minute call
- Check: [platform.openai.com/usage](https://platform.openai.com/usage)

### Twilio:
- ~$0.01-0.02 per minute
- Check: Twilio Console → Usage

---

## 🎉 Success Criteria

You're done when:
- ✅ Form submission triggers immediate call
- ✅ AI greets with custom message
- ✅ AI schedules meeting via conversation
- ✅ Meeting appears in calendar
- ✅ Call tracked in `phone_calls` table

---

## 📝 Next Steps After Success

1. Test with multiple phone numbers
2. Customize AI greeting/voice
3. Add SMS confirmation after booking
4. Set up monitoring alerts
5. Train team on how it works

---

## 🆘 Need Help?

1. Check logs: `wrangler tail`
2. Read `CLOUDFLARE_SETUP.md` for detailed troubleshooting
3. Check Cloudflare Workers documentation
4. Verify all environment variables are set correctly

**Most common issue:** API_SECRET_KEY mismatch between Cloudflare and Next.js
