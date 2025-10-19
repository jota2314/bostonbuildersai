# Cloudflare Voice AI Worker

WebSocket bridge for AI voice calling: Twilio ↔ OpenAI Realtime API

## Setup

### 1. Install Wrangler (Cloudflare CLI)

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Set Environment Variables

```bash
cd cloudflare-voice-worker

# Set secrets (will prompt for values)
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key

wrangler secret put USER_ID
# Paste your Supabase user_id

wrangler secret put NEXT_JS_API_URL
# Enter your Next.js app URL: https://your-app.vercel.app

wrangler secret put API_SECRET_KEY
# Generate a random secret (use: openssl rand -base64 32)
```

### 4. Deploy

```bash
npm install
wrangler deploy
```

This will give you a URL like: `https://boston-builders-voice-ai.YOUR-SUBDOMAIN.workers.dev`

### 5. Update Twilio Configuration

Copy your Worker URL and update `/api/initiate-call/route.ts` in your Next.js app:

```typescript
const wsUrl = 'wss://boston-builders-voice-ai.YOUR-SUBDOMAIN.workers.dev';
```

### 6. Create API Endpoints in Next.js

You need two new API routes in your Next.js app:

1. `/api/book-meeting` - Books meeting in calendar
2. `/api/update-call` - Updates phone call status

These will be called from the Cloudflare Worker.

## Testing

Test locally:

```bash
wrangler dev
```

## Logs

View logs:

```bash
wrangler tail
```

## Cost

Cloudflare Workers Free Tier:
- 100,000 requests/day
- Unlimited WebSocket connections
- **FREE** for your use case!

## How It Works

```
Lead Form Submit
    ↓
Twilio makes call
    ↓
WebSocket to Cloudflare Worker
    ↓
Worker bridges to OpenAI Realtime API
    ↓
AI converses with lead
    ↓
Worker calls Next.js API to book meeting
    ↓
Worker updates call status via Next.js API
```
