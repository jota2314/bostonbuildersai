# Boston Builders AI - Project Context

**Last Updated:** 2025-10-20 (Session: SDK5 migration complete, env vars & Cloudflare stable)
**Owner:** Jorge Betancur
**Domain:** https://www.bostonbuildersai.com

---

## 🎯 Business Model

**What We Do:**
Build custom software for contractors ($500k+ revenue) using a template library approach.

**How It Works:**
1. Build feature templates in THIS repo (development lab / showroom)
2. For each client → create NEW folder + NEW Vercel deployment
3. Copy/paste feature code → customize for their trade (roofing, plumbing, HVAC, etc.)
4. Client gets their own: codebase, database, domain, full ownership

**Not SaaS. Not multi-tenant. Custom software delivered per client.**

---

## 🏗️ Current Project: The Showroom

**This repo IS the showroom** - Jorge's own funnel and feature demonstrations.

**Purpose:**
- Build Jorge's lead generation system (landing page → AI chat → voice call → booking)
- Demonstrate capabilities to prospects
- Create reusable feature templates for client deployments
- Test and refine features before selling them

**Current Stage:** Building Jorge's own automated funnel system FIRST, then build contractor-specific features (estimating, project management, etc.)

---

## 🎨 Target Contractors

All construction trades:
- Insulation, Spray Foam
- Plumbing, Electrical, HVAC
- Roofing, Siding, Windows, Doors
- Stucco, Plaster, Tile, Paint
- Masonry, Concrete, Waterproofing
- Woodwork, Framing, Carpentry
- General Contractors
- Restoration

**Minimum:** $500k+ annual revenue, ready to invest in custom systems.

---

## 🛠️ Tech Stack (ALWAYS USE THIS)

**Framework:**
- Next.js 14 (App Router)
- TypeScript (strict mode)
- React 18

**Styling:**
- Tailwind CSS
- Lucide React (icons)

**State Management:**
- Zustand (ALWAYS use for global state)

**Database:**
- Supabase (per-client database strategy)
- Each client gets their own Supabase project

**AI:**
- AI SDK 5 (Vercel)
- OpenAI GPT-4o
- Twilio (voice calls)
- Cloudflare Workers (voice WebSocket handling)

**Deployment:**
- Vercel (frontend + API routes)
- GitHub (version control)
- Each client = separate repo + separate Vercel project

**Validation:**
- Zod (for API inputs and schemas)

---

## 📁 Repository Structure

```
boston-builders-landing/
├── .claude/
│   ├── Sessions/              # Development session logs
│   │   ├── session-001.md     # AI SDK deployment fixes
│   │   ├── session-002.md     # Timezone bug fixes
│   │   └── session-003.md     # Voice AI qualification
│   └── context.md             # THIS FILE - project overview
├── src/
│   ├── app/                   # Next.js app router
│   │   ├── api/              # API routes
│   │   ├── dashboard/        # Dashboard pages
│   │   └── page.tsx          # Landing page
│   ├── components/           # React components
│   │   ├── ChatWidget.tsx    # AI chat widget
│   │   ├── LeadForm.tsx      # Lead capture form
│   │   └── CalendarChat.tsx  # Calendar integration
│   ├── lib/                  # Utilities & helpers
│   └── store/                # Zustand state stores
├── cloudflare-voice-worker/  # Cloudflare Worker for Twilio voice
├── package.json
└── AI_SDK_5_MIGRATION.md     # AI SDK migration checklist (in progress)
```

---

## ✅ Features Built (Current Showroom)

### 1. Landing Page ✅
- **Location:** `src/app/page.tsx`
- **Description:** Marketing site with hero, features, case studies, pricing, FAQ
- **Status:** Live at bostonbuildersai.com

### 2. Lead Capture Form ✅
- **Location:** `src/components/LeadForm.tsx`
- **Description:** Modal form with phone/email/name capture
- **Triggers:** AI voice call via Twilio
- **Status:** Working

### 3. AI Chat Widget ✅
- **Location:** `src/components/ChatWidget.tsx`
- **API:** `src/app/api/chat/route.ts`
- **Features:**
  - Answers questions about services
  - Saves leads to database
  - Checks calendar availability
  - Books appointments
- **Status:** Working (AI SDK 5)

### 4. AI Voice Calling ✅
- **Trigger:** `src/app/api/initiate-call/route.ts`
- **Worker:** `cloudflare-voice-worker/index.js`
- **Features:**
  - Twilio calls lead back within seconds
  - AI asks business qualification questions:
    - Type of business (trade)
    - Annual revenue estimate
    - Challenges/goals
  - Schedules 30-minute interview
  - Saves context to calendar description
- **Status:** Working (deployed to Cloudflare)

### 5. Calendar System ✅
- **Location:** `src/app/dashboard/calendar/page.tsx`
- **API:** `src/app/api/book-meeting/route.ts`
- **Features:**
  - Supabase-backed calendar events
  - Business context in descriptions
  - Timezone-safe date handling
- **Status:** Working

### 6. Legal Pages ✅
- **Locations:** `src/app/terms/`, `src/app/privacy/`
- **Description:** TCPA compliance, Terms of Service, Privacy Policy
- **Status:** Complete

---

## 🚧 Features Planned (Future Template Library)

These will be built AFTER Jorge's funnel is complete and optimized:

### For Contractors:
1. **Lead Hunter**
   - Building permit tracking dashboard
   - Manual entry + optional scrapers (per city)

2. **CRM**
   - Lead pipeline management
   - Contact & project tracking
   - Communication history

3. **Estimating Tools** (Trade-Specific)
   - Custom pricing templates per trade
   - Material cost tracking
   - Proposal generation
   - Plans takeoff service integration

4. **Project Management**
   - Job scheduling
   - Crew assignments
   - Progress tracking

5. **SEO Websites** (Landing Pages)
   - Trade-specific templates
   - Local SEO optimization
   - Lead capture integration

6. **Marketing Services**
   - Ad management training
   - Video/drone services
   - Marketing playbooks

---

## 🔄 Development Workflow

### Building Features:
1. Build feature in THIS repo (showroom)
2. Test thoroughly with Jorge's use case
3. Document setup in `.claude/features/[feature]-setup.md`
4. Refine until perfect

### Deploying to Clients:
1. Create new folder: `/clients/[company-name]`
2. Clone feature code from showroom
3. Customize for their trade/workflow
4. New Supabase project (client owns data)
5. Deploy to Vercel under client's domain
6. Client gets: repo access, hosting, database, full ownership

### Template Strategy:
- **NOW:** Documentation-first (write guides as we build)
- **LATER:** May refactor to feature modules if patterns emerge
- **DON'T:** Over-engineer before seeing real client patterns

---

## 💾 Database Strategy

**Supabase - Per-Client Approach:**
- Each client gets their own Supabase project
- Full data isolation
- Client owns and controls their data
- Can be transferred to their account

**Schema Management:**
- Keep reference schema updated in this repo
- Export schema per feature
- Deploy fresh for each client (customize as needed)

**This Showroom Database:**
- Jorge's leads, conversations, calendar events
- Test data for features
- Schema reference for client deployments

---

## 🎯 Current Sprint: Optimize Jorge's Funnel

**Goal:** Perfect the automated lead → call → booking flow

**Focus Areas:**
1. ✅ Voice AI business qualification working
2. ✅ Calendar booking with context working
3. ✅ Chat widget optimized (AI SDK 5 complete)
4. ⏳ Dashboard for managing leads/calls
5. ⏳ Analytics tracking (conversion rates)

**Next Feature to Build:** Lead management dashboard

**System Status:** Core funnel (landing → chat → call → booking) fully operational

---

## 📚 Session History

See `.claude/Sessions/` for detailed logs:
- **session-001.md:** Deployment errors, AI SDK issues
- **session-002.md:** Timezone bug fix (calendar dates)
- **session-003.md:** Voice AI qualification questions, Vercel outage

---

## 🚨 Known Issues / Tech Debt

1. ~~**AI SDK 5 Migration:**~~ ✅ Complete and working
2. ~~**Message persistence:**~~ ✅ Using AI SDK v5 with backward compatibility (stable)
3. ~~**Environment variables:**~~ ✅ All set and consistent
4. ~~**Cloudflare Worker:**~~ ✅ Working fine in production

**Current:** No critical tech debt. System stable and operational.

---

## 🔑 Key Decisions Made

1. **No Multi-Tenant:** Each client = separate deployment
2. **Per-Client Databases:** Full isolation, client ownership
3. **Tech Stack Consistency:** Always Next.js + Supabase + Zustand + AI SDK 5
4. **Template Strategy:** Documentation-first, refactor later
5. **Build Order:** Jorge's funnel first, then contractor features
6. **Voice AI:** Cloudflare Workers (not Next.js API due to timeout limits)

---

## 💡 Jorge's Background

- 7 years in construction (laborer → General Manager)
- Self-taught developer
- Built systems for: Solar Señorita, Econova Energy Savings
- Understands contractor workflows from experience
- Value prop: "Built by someone who's been in the trenches"

---

## 📞 Contact & Links

- **Website:** https://www.bostonbuildersai.com
- **Email:** contact@bostonbuildersai.com
- **Repository:** https://github.com/jota2314/bostonbuildersai.git
- **Deployed On:** Vercel

---

## 🎓 For Future AI Sessions

**When starting a new session:**
1. Read this context.md file first
2. Check latest session in `.claude/Sessions/` for recent work
3. Ask Jorge what feature/issue to work on
4. Update session logs when making significant changes
5. Keep this context.md updated with new decisions/features

**Remember:**
- Think hard, answer short (Jorge's preference)
- No changes without asking first during investigation phase
- Always use TodoWrite for multi-step tasks
- Commit frequently with clear messages
- Test before deploying

---

**End of Context**
