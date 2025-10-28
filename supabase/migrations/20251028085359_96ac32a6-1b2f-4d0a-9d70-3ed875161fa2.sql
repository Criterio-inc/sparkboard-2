-- Add plan and plan_source columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'curago')),
ADD COLUMN IF NOT EXISTS plan_source TEXT CHECK (plan_source IN ('stripe', 'curago_domain', 'manual'));

-- Create index for better query performance on plan column
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);