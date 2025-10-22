-- Add transcript, summary, and recording_duration to phone_calls table
ALTER TABLE phone_calls
ADD COLUMN IF NOT EXISTS transcript TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS recording_duration INTEGER;

-- Add comments to document the columns
COMMENT ON COLUMN phone_calls.transcript IS 'Full transcription of the call from Twilio';
COMMENT ON COLUMN phone_calls.summary IS 'AI-generated summary of the call';
COMMENT ON COLUMN phone_calls.recording_duration IS 'Duration of the recording in seconds';
