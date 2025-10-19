# Calendar Booking Setup Instructions

## ✅ What's Been Done

Your chat agent on the homepage can now:
1. **Qualify leads** (already worked)
2. **Check your calendar** for available time slots
3. **Book appointments** directly on your calendar

## 🔧 Setup Required (5 minutes)

### Step 1: Get Your User ID

Run this in your terminal:

```bash
npm run dev
```

Then open your browser console (F12) and run this in the Console tab while logged in to your calendar:

```javascript
// Copy this whole block and paste it in browser console
const getUser = async () => {
  const res = await fetch('/api/auth/session');
  const data = await res.json();
  console.log('YOUR USER ID:', data?.user?.id);
  return data?.user?.id;
}
getUser();
```

**OR** simpler way - just tell me your email (jorgebetancurf@gmail.com?) and I can find it for you.

### Step 2: Add User ID to Environment Variables

Add this to your `.env.local` file:

```bash
# Jorge's User ID for calendar booking
JORGE_USER_ID=your-user-id-here
```

Replace `your-user-id-here` with the actual ID from Step 1.

### Step 3: Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

## 🎯 How It Works

### Example Conversation:

**Visitor**: "I'd like to learn more about your services"

**Agent**: "Great! I'd be happy to tell you about Boston Builders AI. We build custom operating systems for contractors... [explains services]. Would you like to schedule a call with Jorge?"

**Visitor**: "Yes, how about tomorrow?"

**Agent**: *checks your calendar* "I have these times available tomorrow:
- 9:00 AM
- 11:00 AM
- 2:00 PM
- 4:00 PM

Which works best for you?"

**Visitor**: "2 PM works great"

**Agent**: "Perfect! Can I get your name and email to confirm the appointment?"

**Visitor**: "John Smith, john@example.com"

**Agent**: *books appointment* "All set! You're scheduled for tomorrow at 2:00 PM. Jorge will send you a calendar invite to john@example.com shortly."

### What the Agent Sees:

- ✅ All your calendar events
- ✅ Your sleep schedule (respects it)
- ✅ Available time slots only
- ✅ Never double-books

### What Gets Created:

When someone books, it creates an event in your calendar like:

```
Title: Call with John Smith
Description:
  Company: ABC Roofing
  Email: john@example.com
  Phone: (555) 123-4567
  Purpose: Discovery call
Date: 2025-10-17
Time: 14:00 - 15:00
```

## 🚀 Next Steps (Optional)

### Add Email Notifications

Want to automatically send calendar invites? We can add:
- Email to visitor confirming appointment
- Email to you with their info
- iCal file attachment for both

Let me know if you want this!

### Add Voice AI Integration

For your workflow where AI calls visitors after form submission:
- We can connect VAPI/Bland/Retell to this same API
- Voice AI can check calendar and book during the call
- Same availability checking, same booking system

## 📝 Testing

To test it:

1. Go to your website homepage
2. Click the chat bubble (bottom right)
3. Say "I want to schedule a call"
4. Follow the conversation
5. Check your calendar - the appointment should appear!

## ⚙️ Configuration

The agent books:
- **Weekdays**: Between 5 AM - 9 PM (avoids your 9 PM - 5 AM sleep)
- **Weekends**: Between 7 AM - 11 PM (avoids your 11 PM - 7 AM sleep)
- **1-hour appointments** by default
- **Never during existing events**

All of this respects your calendar and sleep schedule automatically!

---

**Questions?** Let me know and I'll help you get this running!
