-- Create assistance_requests table
-- This table stores requests from judges when they need technical assistance

CREATE TABLE IF NOT EXISTS assistance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judge_id UUID REFERENCES judges(id) ON DELETE CASCADE NOT NULL,
  judge_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_assistance_judge ON assistance_requests(judge_id);
CREATE INDEX idx_assistance_status ON assistance_requests(status);
CREATE INDEX idx_assistance_requested_at ON assistance_requests(requested_at DESC);

-- Enable Row Level Security
ALTER TABLE assistance_requests ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (since we're not using auth)
CREATE POLICY "Allow all on assistance_requests" ON assistance_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE assistance_requests IS 'Tracks technical assistance requests from judges during events';
COMMENT ON COLUMN assistance_requests.status IS 'Request status: pending (waiting for help), resolved (help provided), cancelled (judge no longer needs help)';
COMMENT ON COLUMN assistance_requests.requested_at IS 'When the judge clicked the assistance button';
COMMENT ON COLUMN assistance_requests.resolved_at IS 'When event staff marked the request as resolved';
COMMENT ON COLUMN assistance_requests.resolved_by IS 'Name of the staff member who helped';
COMMENT ON COLUMN assistance_requests.notes IS 'Optional notes about the issue and resolution';
