-- Create judges table
CREATE TABLE judges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url_token TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contestants table
-- NOTE: number is NOT unique alone - same number allowed for different genders
-- The composite unique constraint (number, sex) is added separately below
CREATE TABLE contestants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  college TEXT NOT NULL,
  number INTEGER NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT contestants_number_sex_unique UNIQUE (number, sex)
);

-- Create scores table with weighted categories
-- Category 1: 60-20-20 = 100 (Weight: 60%)
-- Category 2: 50-50 = 100 (Weight: 20%)
-- Category 3: 40-30-20 = 100 (Weight: 20%)
-- Weighted Total = (Cat1 * 0.6) + (Cat2 * 0.2) + (Cat3 * 0.2)
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
  contestant_id UUID REFERENCES contestants(id) ON DELETE CASCADE,
  
  -- Category 1 (60% weight) - Total: 100
  cat1_score1 NUMERIC(5,2) DEFAULT 0, -- Max: 60
  cat1_score2 NUMERIC(5,2) DEFAULT 0, -- Max: 20
  cat1_score3 NUMERIC(5,2) DEFAULT 0, -- Max: 20
  cat1_total NUMERIC(5,2) GENERATED ALWAYS AS (cat1_score1 + cat1_score2 + cat1_score3) STORED,
  
  -- Category 2 (20% weight) - Total: 100
  cat2_score1 NUMERIC(5,2) DEFAULT 0, -- Max: 50
  cat2_score2 NUMERIC(5,2) DEFAULT 0, -- Max: 50
  cat2_total NUMERIC(5,2) GENERATED ALWAYS AS (cat2_score1 + cat2_score2) STORED,
  
  -- Category 3 (20% weight) - Total: 100
  cat3_score1 NUMERIC(5,2) DEFAULT 0, -- Max: 40
  cat3_score2 NUMERIC(5,2) DEFAULT 0, -- Max: 30
  cat3_score3 NUMERIC(5,2) DEFAULT 0, -- Max: 20
  cat3_total NUMERIC(5,2) GENERATED ALWAYS AS (cat3_score1 + cat3_score2 + cat3_score3) STORED,
  
  -- Weighted total: (Cat1 * 0.6) + (Cat2 * 0.2) + (Cat3 * 0.2)
  weighted_total NUMERIC(6,2) GENERATED ALWAYS AS (
    (cat1_score1 + cat1_score2 + cat1_score3) * 0.6 + 
    (cat2_score1 + cat2_score2) * 0.2 + 
    (cat3_score1 + cat3_score2 + cat3_score3) * 0.2
  ) STORED,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(judge_id, contestant_id)
);

-- Create settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
  ('is_locked', 'false'),
  ('round_name', 'Main Round');

-- Create indexes for better performance
CREATE INDEX idx_scores_judge ON scores(judge_id);
CREATE INDEX idx_scores_contestant ON scores(contestant_id);
CREATE INDEX idx_contestants_number ON contestants(number);
CREATE INDEX idx_judges_token ON judges(url_token);

-- Enable Row Level Security (optional for later)
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since we're not using auth)
CREATE POLICY "Allow all on judges" ON judges FOR ALL USING (true);
CREATE POLICY "Allow all on contestants" ON contestants FOR ALL USING (true);
CREATE POLICY "Allow all on scores" ON scores FOR ALL USING (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for scores table
CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON scores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for settings table
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
