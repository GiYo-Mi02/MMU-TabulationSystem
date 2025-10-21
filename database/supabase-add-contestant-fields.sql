-- Migration: Add additional contestant fields
-- Add new columns to contestants table

ALTER TABLE contestants
  ADD COLUMN IF NOT EXISTS college TEXT,
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('Male', 'Female', 'Other')),
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age > 0 AND age < 150);

-- Update the table comment
COMMENT ON TABLE contestants IS 'Contestants table with name, college, candidate number, sex, age, and photo';
COMMENT ON COLUMN contestants.name IS 'Full name of the contestant';
COMMENT ON COLUMN contestants.number IS 'Candidate number (unique identifier)';
COMMENT ON COLUMN contestants.college IS 'College or school the contestant represents';
COMMENT ON COLUMN contestants.sex IS 'Sex/Gender of the contestant';
COMMENT ON COLUMN contestants.age IS 'Age of the contestant';
COMMENT ON COLUMN contestants.photo_url IS 'URL to the contestant photo';
