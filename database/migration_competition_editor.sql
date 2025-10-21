-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    order_index INTEGER NOT NULL DEFAULT 0,
    is_open BOOLEAN DEFAULT false,
    is_convention BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create criteria table
CREATE TABLE IF NOT EXISTS criteria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    max_points INTEGER NOT NULL CHECK (max_points > 0 AND max_points <= 100),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scores table (updated to work with dynamic criteria)
CREATE TABLE IF NOT EXISTS contestant_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contestant_id, judge_id, criterion_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(order_index);
CREATE INDEX IF NOT EXISTS idx_criteria_category ON criteria(category_id);
CREATE INDEX IF NOT EXISTS idx_criteria_order ON criteria(order_index);
CREATE INDEX IF NOT EXISTS idx_contestant_scores_contestant ON contestant_scores(contestant_id);
CREATE INDEX IF NOT EXISTS idx_contestant_scores_judge ON contestant_scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_contestant_scores_criterion ON contestant_scores(criterion_id);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestant_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for categories (public read, authenticated write)
CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON categories FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON categories FOR DELETE USING (true);

-- Create policies for criteria (public read, authenticated write)
CREATE POLICY "Enable read access for all users" ON criteria FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON criteria FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON criteria FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON criteria FOR DELETE USING (true);

-- Create policies for contestant_scores (public read, authenticated write)
CREATE POLICY "Enable read access for all users" ON contestant_scores FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON contestant_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON contestant_scores FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON contestant_scores FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criteria_updated_at BEFORE UPDATE ON criteria
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contestant_scores_updated_at BEFORE UPDATE ON contestant_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
