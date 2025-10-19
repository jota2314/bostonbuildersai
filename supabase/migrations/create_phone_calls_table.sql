-- Create phone_calls table
CREATE TABLE IF NOT EXISTS phone_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  call_sid TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('initiated', 'in-progress', 'completed', 'failed', 'no-answer')),
  duration_seconds INTEGER,
  transcript TEXT,
  meeting_scheduled BOOLEAN DEFAULT FALSE,
  meeting_date DATE,
  meeting_time TIME,
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_phone_calls_lead_id ON phone_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_phone_calls_call_sid ON phone_calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_phone_calls_user_id ON phone_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_calls_created_at ON phone_calls(created_at DESC);

-- Enable Row Level Security
ALTER TABLE phone_calls ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access (for API routes)
CREATE POLICY "Enable all access for service role" ON phone_calls
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create policy for authenticated users to view their own calls
CREATE POLICY "Users can view own calls" ON phone_calls
  FOR SELECT
  USING (auth.uid()::text = user_id::text);
