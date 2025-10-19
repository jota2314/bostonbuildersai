# Cloudflare Worker Setup for AI Voice Calling

## ✅ What I Built

Complete Cloudflare Worker that handles WebSocket connections for AI voice calls.

### Files Created:

1. **`cloudflare-voice-worker/index.js`** - WebSocket bridge (Twilio ↔ OpenAI)
2. **`cloudflare-voice-worker/wrangler.toml`** - Cloudflare config
3. **`cloudflare-voice-worker/package.json`** - Dependencies
4. **API Endpoints:**
   - `/api/book-meeting` - Books meetings from AI
   - `/api/update-call` - Updates call status

---

## 🚀 Deployment Steps

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This opens your browser to authenticate.

### 3. Generate API Secret

```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Copy this secret** - you'll need it for both Cloudflare and Next.js!

### 4. Add to Next.js `.env.local`

```env
# Add this new variable:
API_SECRET_KEY=YOUR_SECRET_FROM_STEP_3
```

### 5. Deploy Cloudflare Worker

```bash
cd cloudflare-voice-worker
npm install
```

Now set your secrets:

```bash
# Set OpenAI API key
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI key when prompted

# Set User ID
wrangler secret put USER_ID
# Paste your Supabase user_id

# Set Next.js URL
wrangler secret put NEXT_JS_API_URL
# Enter: https://your-app.vercel.app (your deployed Vercel URL)

# Set API Secret
wrangler secret put API_SECRET_KEY
# Paste the secret from step 3
```

Finally, deploy:

```bash
wrangler deploy
```

**Copy the Worker URL** - looks like:
```
https://boston-builders-voice-ai.YOUR-NAME.workers.dev
```

### 6. Update Twilio Configuration

Edit `src/app/api/initiate-call/route.ts`:

Replace this line (around line 31):
```typescript
const wsUrl = `wss://${baseUrl.replace('https://', '').replace('http://', '')}/api/voice-websocket`;
```

With:
```typescript
const wsUrl = 'wss://boston-builders-voice-ai.YOUR-NAME.workers.dev';
```

Use your actual Worker URL from step 5.

### 7. Deploy Next.js Changes

```bash
git add .
git commit -m "Add AI voice calling with Cloudflare Worker"
git push
```

Vercel will auto-deploy.

---

## 🧪 Testing

1. **Fill out lead form** on your landing page
2. **Submit with phone number**
3. **You should get a call immediately!**
4. **AI will greet you** and ask to schedule
5. **Provide date/time**
6. **Check calendar** - meeting should be booked!

---

## 📊 Monitoring

### View Worker Logs:

```bash
cd cloudflare-voice-worker
wrangler tail
```

Keep this running while testing to see real-time logs.

### Check Cloudflare Dashboard:

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Workers & Pages
3. Click your worker
4. View metrics, logs, and errors

---

## 💰 Cost

**Cloudflare Workers - FREE!**
- 100,000 requests/day
- Unlimited WebSocket duration
- No bandwidth charges

**Only pay for:**
- OpenAI Realtime API (~$0.60 per 2-min call)
- Twilio (~$0.01 per minute)

---

## 🐛 Troubleshooting

### Worker not receiving connections?

Check:
- Worker URL in `initiate-call/route.ts` is correct
- Using `wss://` (not `ws://`)
- Worker is deployed: `wrangler deployments list`

### OpenAI connection fails?

Check:
- `OPENAI_API_KEY` secret is set: `wrangler secret list`
- API key is valid on [platform.openai.com](https://platform.openai.com)

### Meeting not booking?

Check:
- `API_SECRET_KEY` matches in both Cloudflare and Next.js `.env.local`
- `NEXT_JS_API_URL` is your deployed Vercel URL (not localhost)
- Worker logs: `wrangler tail`

### Call connects but no audio?

Check:
- OpenAI Realtime API is enabled on your OpenAI account
- Worker logs show "Connected to OpenAI Realtime API"
- Twilio Media Streams are enabled (should be by default)

---

## 🔄 Updates

To update the Worker:

```bash
cd cloudflare-voice-worker
# Make changes to index.js
wrangler deploy
```

Changes are live immediately!

---

## 📝 Customization

### Change AI Voice:

Edit `cloudflare-voice-worker/index.js`, line 74:
```javascript
voice: 'alloy' // Options: alloy, echo, fable, onyx, nova, shimmer
```

### Change Greeting:

Edit `SYSTEM_INSTRUCTIONS` in `cloudflare-voice-worker/index.js`

### Change Meeting Duration:

Default is 60 minutes. AI will ask and user can specify.

---

## 🎯 Next Steps

After deployment works:
1. Test with multiple phone numbers
2. Monitor costs (Cloudflare dashboard + OpenAI usage)
3. Add error alerts
4. Customize AI conversation flow
5. Add SMS confirmations after booking

---

## 📞 Support

If you get stuck:
1. Check `wrangler tail` for live logs
2. Check Cloudflare dashboard for errors
3. Check Next.js `/api/book-meeting` and `/api/update-call` logs in Vercel

**Remember:** Cloudflare Worker is FREE, so you can test unlimited! 🎉
