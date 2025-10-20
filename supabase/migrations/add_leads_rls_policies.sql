-- Enable Row Level Security on leads table (if not already enabled)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Enable all access for service role" ON leads;
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

-- Create policy to allow service role full access (for API routes)
CREATE POLICY "Enable all access for service role" ON leads
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create policy for authenticated users to view their own leads
CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Create policy for authenticated users to insert their own leads
CREATE POLICY "Users can insert own leads" ON leads
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy for authenticated users to update their own leads
CREATE POLICY "Users can update own leads" ON leads
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy for authenticated users to delete their own leads
CREATE POLICY "Users can delete own leads" ON leads
  FOR DELETE
  USING (auth.uid()::text = user_id::text);
