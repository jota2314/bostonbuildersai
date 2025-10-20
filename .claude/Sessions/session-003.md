# Session: AI Voice Calling Business Qualification & Deployment Fixes

**Date:** 2025-10-20
**Tags:** twilio, cloudflare-worker, ai-calling, business-qualification, deployment, vercel-outage, eslint

## Objective

Investigate and fix AI voice calling configuration, add business qualification questions to AI caller, resolve deployment issues, and enhance calendar events with rich business context.

## Summary

Successfully debugged Twilio/Cloudflare Worker configuration, added business qualification functionality to AI voice calls, fixed multiple ESLint/TypeScript errors blocking deployment, and enhanced calendar integration to capture and display business context (company type, revenue, challenges). Deployment was impacted by a major Vercel infrastructure outage affecting the IAD1 region.

## Details

### Initial Investigation

**User Issue:**
"When I put a lead in, it calls back. But in my last session, I couldn't get the calendars because localhost doesn't work with Cloudflare Workers."

**Investigation Findings:**

1. **Environment Variable Mismatch**
   - `.env.local` had `JORGE_USER_ID` but code expected `USER_ID`
   - Solution: Added `USER_ID` alongside `JORGE_USER_ID` (both point to same value)
   - File: `.env.local` line 14

2. **Vercel Not Deployed**
   - Codebase not linked to Vercel project
   - Cloudflare Worker's `NEXT_JS_API_URL` pointing to invalid/localhost URL
   - This prevented calendar API calls from Cloudflare Worker

3. **Cloudflare Worker Status**
   - Worker properly deployed (last: 2025-10-19 23:28:14)
   - All 4 secrets configured: ✅ OPENAI_API_KEY, USER_ID, NEXT_JS_API_URL, API_SECRET_KEY
   - Worker URL: `wss://boston-builders-voice-ai.jorgebetancurfx.workers.dev`

### Deployment Errors - Multiple Iterations

**Round 1: ESLint Errors**
- `voice-websocket/route.ts:69` - Unused `leadName` variable
- `test-twilio/page.tsx:29` - Unused `error` variable
- `test-twilio/page.tsx:104` - Unescaped quotes in JSX
- **Fix:** Removed unused variables, escaped quotes with `&quot;`
- **Commit:** c5b470c

**Round 2: TypeScript Route Error**
- Invalid export `handleTwilioWebSocket` in Next.js route file
- Next.js routes only allow GET, POST, PUT, DELETE exports
- **Fix:** Removed `export` keyword from helper function
- **Commit:** 6af1eac

**Round 3: Unused Helper Function**
- `handleTwilioWebSocket` function defined but never used
- Legacy code from old architecture (WebSocket now in Cloudflare Worker)
- **Fix:** Deleted 302 lines of dead code from `voice-websocket/route.ts`
- **Commit:** a3e5e83

**Round 4: Business Qualification Variables**
- `businessType`, `annualRevenue`, `notes` extracted but unused
- **Fix:** Removed from destructuring (data already in `description` field)
- **Commit:** 1384917

### Business Qualification Feature

**User Requirements:**
1. Meeting title should include contact name
2. Meetings should be 30 minutes (not 60)
3. AI should ask qualifying questions:
   - What type of business? (roofing, plumbing, HVAC, etc.)
   - Approximate annual revenue?
   - Challenges or goals to discuss?
4. Calendar event should include all business context

**Implementation:**

**Cloudflare Worker Changes (`cloudflare-voice-worker/index.js`):**

1. **Updated AI Instructions:**
```javascript
const SYSTEM_INSTRUCTIONS = `You are Jorge's AI assistant calling to schedule
an interview meeting and qualify business leads.

Your role:
1. Greet the person warmly
2. Ask a few quick qualifying questions:
   - What type of business do they run?
   - What's their approximate annual revenue?
   - Any specific challenges or goals?
3. Ask when they would be available for a meeting
4. Suggest available time slots (weekdays 9 AM - 5 PM)
5. Confirm the date and time
6. Use the book_meeting tool to schedule it (include all info gathered)
7. Confirm the booking and thank them

Guidelines:
- Be friendly, professional, and conversational (not interrogative)
- Keep questions natural and flowing
- If they hesitate on revenue, say "just a rough estimate is fine"
- Keep the call under 3 minutes`;
```

2. **Enhanced book_meeting Function Parameters:**
```javascript
{
  date: 'YYYY-MM-DD',
  time: 'HH:MM',
  duration_minutes: 30,  // Changed default from 60
  contact_name: 'Name of person',
  business_type: 'e.g., roofing, plumbing',
  annual_revenue: 'e.g., "$500K", "$1M-2M"',
  notes: 'Challenges, goals, context'
}
```

3. **Formatted Calendar Description:**
```javascript
const description = `Interview with ${contactName}

Business: ${businessType}
Annual Revenue: ${revenue}

Notes:
${notes}

Lead ID: ${leadId || 'N/A'}`;
```

4. **Meeting Duration Change:**
```javascript
const durationMinutes = args.duration_minutes || 30; // Default 30 minutes
```

**Next.js API Changes (`src/app/api/book-meeting/route.ts`):**

1. **Dynamic Meeting Title:**
```javascript
const title = contactName
  ? `Interview - ${contactName}`
  : 'Interview Meeting';
```

2. **Accept Custom Description:**
```javascript
const eventDescription = description ||
  (leadId ? `Scheduled via AI call - Lead ID: ${leadId}` : 'Scheduled via AI call');
```

**Result:**
Calendar events now show:
- **Title:** "Interview - John Smith"
- **Description:** Full business context with type, revenue, notes
- **Duration:** 30 minutes

### Vercel Infrastructure Outage

**Timeline:**
- Started: Oct 20, 2025 07:30 UTC (11+ hours)
- Affected: IAD1 region (Washington D.C.)
- Issue: Multiple deployment failures despite successful builds

**Impact:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Build Completed in /vercel/output [48s]
❌ Deploying outputs...
   "An unexpected error happened when running this build"
```

**Vercel Status Updates:**
- Deployment creation for Secure Compute/Static IPs impacted
- Edge Functions and Middleware invocation errors
- Traffic rerouted from IAD1 (increased latency)
- Recovery in progress as of 18:06 UTC

**Workaround:**
- User can test from localhost (form submission works)
- Cloudflare Worker calls production URL (has old code until Vercel recovers)
- Old behavior: 60-min meetings, no business context, generic title

### Setup Verification

**Environment Variables - Cloudflare Worker:**
```
✅ API_SECRET_KEY
✅ NEXT_JS_API_URL (https://www.bostonbuildersai.com)
✅ OPENAI_API_KEY
✅ USER_ID
```

**Environment Variables - Vercel:**
```
✅ USER_ID (added during session)
✅ API_SECRET_KEY
✅ All Twilio credentials
✅ Supabase credentials
```

**Deployment Status:**
- Cloudflare Worker: ✅ Deployed (Version: 46ce7ead-0e96-4610-9d31-4676a6423c8d)
- Next.js (Vercel): ⏳ Blocked by infrastructure outage

## Key Takeaways

- **Localhost + Production Hybrid:** Form submission from localhost works because Cloudflare Worker calls production API URL (not localhost)

- **Environment Variable Naming:** Inconsistent naming (`JORGE_USER_ID` vs `USER_ID`) caused runtime failures. Solution: maintain both for backward compatibility

- **Dead Code Detection:** ESLint caught 302 lines of unused legacy code that would have bloated the bundle

- **Infrastructure Dependencies:** Even perfect code can't deploy during provider outages. Having monitoring URLs (vercel-status.com) is valuable

- **AI Conversation Design:** Making qualification questions feel "conversational not interrogative" improves user experience. Added guidance: "just a rough estimate is fine"

- **Function Tool Design:** OpenAI function parameters should match expected data format. Default values in function description (e.g., "default 30") guide AI behavior

## Code Flow

**Complete AI Call Flow:**
```
1. User fills lead form → localhost:3000 or production
2. /api/initiate-call → Creates Twilio call
3. Twilio → Connects to Cloudflare Worker (WebSocket)
4. Cloudflare Worker → Opens OpenAI Realtime API connection
5. AI asks qualifying questions (business type, revenue, challenges)
6. AI uses book_meeting function with all context
7. Cloudflare Worker → POST to production /api/book-meeting
8. Production API → Creates calendar event in Supabase
9. User sees rich calendar event with full business context
```

## Files Modified

### Cloudflare Worker
- `cloudflare-voice-worker/index.js`
  - Updated SYSTEM_INSTRUCTIONS (added qualification questions)
  - Enhanced book_meeting tool parameters
  - Changed default duration to 30 minutes
  - Added contact name, business type, revenue, notes handling
  - Built formatted description with business context

### Next.js API
- `src/app/api/book-meeting/route.ts`
  - Added contact name to meeting title
  - Added support for custom description field
  - Accepts business context (even if not storing separately)

### Cleanup
- `src/app/api/voice-websocket/route.ts`
  - Deleted 302 lines of legacy WebSocket code
  - Removed unused imports
  - Now just a placeholder (actual WebSocket in Cloudflare)

### Test Files
- `src/app/test-twilio/page.tsx`
  - Fixed unused error variable
  - Escaped JSX quotes

### Environment
- `.env.local`
  - Added `USER_ID` alongside `JORGE_USER_ID`

## Git Commits

1. `c5b470c` - Fix ESLint errors blocking Vercel deployment
2. `6af1eac` - Fix Next.js Route type error - remove invalid export
3. `a3e5e83` - Remove legacy WebSocket code from voice-websocket route
4. `7a396d2` - Add business qualification to AI calls
5. `b868cb1` - Update Cloudflare Worker for business qualification
6. `1384917` - Fix ESLint unused variable errors in book-meeting

## Impact

**Before:**
- Meeting title: "Interview Meeting" (generic)
- Description: "Scheduled via AI call - Lead ID: 123"
- Duration: 60 minutes
- No business context for Jorge before calls
- Deployment blocked by ESLint errors

**After:**
- Meeting title: "Interview - [Contact Name]"
- Description: Full business profile (type, revenue, challenges)
- Duration: 30 minutes
- Jorge has complete context before joining call
- Clean codebase passing all linting checks

## Next Steps

- [ ] Wait for Vercel infrastructure recovery (monitor: https://www.vercel-status.com/)
- [ ] Retry deployment: `vercel --prod --force`
- [ ] Test end-to-end flow with real phone call
- [ ] Verify calendar events show business context correctly
- [ ] Monitor AI call quality (are questions natural? do people answer?)
- [ ] Consider adding SMS confirmation after booking
- [ ] Add analytics to track qualification question response rates

## Debugging Resources

**View Cloudflare Worker Logs (Real-time):**
```bash
cd boston-builders-landing/cloudflare-voice-worker
wrangler tail
```

**Check Vercel Logs:**
1. vercel.com/dashboard
2. Select project → Logs tab
3. Filter by `/api/book-meeting`

**Verify Cloudflare Secrets:**
```bash
cd boston-builders-landing/cloudflare-voice-worker
wrangler secret list
```

## Related Sessions

- [session-001.md](./session-001.md) - Deployment Errors Session (AI SDK issues)
- [session-002.md](./session-002.md) - ESLint Fixes and Timezone Bug Resolution

---

**Session Status:** Completed (Pending Vercel Infrastructure Recovery)
**Cloudflare Worker Status:** ✅ Deployed & Live
**Next.js Deployment Status:** ⏳ Blocked by Vercel IAD1 Outage
**Features Implemented:** Business Qualification, 30-min Meetings, Contact Names in Titles
**ESLint Errors Resolved:** 6 across 4 files
**Lines of Dead Code Removed:** 302
