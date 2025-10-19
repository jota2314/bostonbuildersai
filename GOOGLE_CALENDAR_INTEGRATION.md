# Google Calendar Integration Guide

## Overview
You can integrate your calendar with Google Calendar to sync events both ways. This would allow you to:
- Import events from Google Calendar into your app
- Export events from your app to Google Calendar
- Two-way sync to keep both calendars in sync

## Implementation Steps

### 1. Set up Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Web application type)
5. Add authorized redirect URIs (your app's callback URL)

### 2. Add Environment Variables
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### 3. Install Required Packages
```bash
npm install googleapis @supabase/auth-helpers-nextjs
```

### 4. Implementation Features

#### Basic Sync (Recommended First Step)
- **Import from Google**: Fetch events from Google Calendar and create them in your app
- **Export to Google**: Push events from your app to Google Calendar
- **Manual sync button**: Let users trigger sync when needed

#### Advanced Features (Optional)
- **Real-time sync**: Use Google Calendar webhooks to sync changes automatically
- **Selective sync**: Let users choose which calendars to sync
- **Conflict resolution**: Handle conflicts when same event is modified in both places

### 5. Database Changes Needed
Add a new table for storing Google Calendar tokens:
```sql
CREATE TABLE google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Google event ID to calendar_events table
ALTER TABLE calendar_events
ADD COLUMN google_event_id TEXT UNIQUE;
```

### 6. Implementation Timeline
- **Simple one-way import**: 2-3 hours
- **Two-way sync with manual trigger**: 4-6 hours
- **Full real-time sync**: 8-12 hours

## Pros and Cons

### Pros
- Access your schedule from multiple devices
- Integrate with Google Meet, Gmail, etc.
- Share calendars with others easily
- Get Google Calendar notifications

### Cons
- Additional complexity in codebase
- Need to handle OAuth flows
- Token refresh logic required
- Potential sync conflicts
- Privacy considerations (storing Google tokens)

## Recommendation
Start with the AI assistant first (which we just built!). The AI can help you schedule everything efficiently. Then, if you find you really need Google Calendar integration, we can add it later.

The AI assistant provides most of the benefits without the complexity:
- Natural language scheduling
- Smart suggestions
- Context-aware planning
- No external dependencies

If you still want Google Calendar sync, let me know and I can implement it!
