# Supabase schema for The Living Logger
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Policy: authenticated users can insert own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: authenticated users can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- training_days table
CREATE TABLE IF NOT EXISTS training_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE training_days ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read own training days
CREATE POLICY "Users can read own training days" ON training_days
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: authenticated users can insert own training days
CREATE POLICY "Users can insert own training days" ON training_days
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: authenticated users can update own training days
CREATE POLICY "Users can update own training days" ON training_days
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Policy: authenticated users can delete own training days
CREATE POLICY "Users can delete own training days" ON training_days
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_days_user_id ON training_days(user_id);
CREATE INDEX IF NOT EXISTS idx_training_days_sort_order ON training_days(sort_order);

-- exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_day_id UUID REFERENCES training_days(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read own exercises
CREATE POLICY "Users can read own exercises" ON exercises
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: authenticated users can insert own exercises
CREATE POLICY "Users can insert own exercises" ON exercises
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: authenticated users can update own exercises
CREATE POLICY "Users can update own exercises" ON exercises
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Policy: authenticated users can delete own exercises
CREATE POLICY "Users can delete own exercises" ON exercises
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_training_day_id ON exercises(training_day_id);
CREATE INDEX IF NOT EXISTS idx_exercises_starred ON exercises(starred DESC);

-- workout_sessions table
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_day_id UUID REFERENCES training_days(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'aborted')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read own sessions
CREATE POLICY "Users can read own sessions" ON workout_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: authenticated users can insert own sessions
CREATE POLICY "Users can insert own sessions" ON workout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: authenticated users can update own sessions
CREATE POLICY "Users can update own sessions" ON workout_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Policy: authenticated users can delete own sessions
CREATE POLICY "Users can delete own sessions" ON workout_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_training_day_id ON workout_sessions(training_day_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started_at ON workout_sessions(started_at DESC);

-- workout_sets table
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  set_number INTEGER DEFAULT 1,
  weight NUMERIC DEFAULT 0,
  reps INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  done BOOLEAN DEFAULT FALSE,
  failed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read own sets
CREATE POLICY "Users can read own sets" ON workout_sets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: authenticated users can insert own sets
CREATE POLICY "Users can insert own sets" ON workout_sets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: authenticated users can update own sets
CREATE POLICY "Users can update own sets" ON workout_sets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Policy: authenticated users can delete own sets
CREATE POLICY "Users can delete own sets" ON workout_sets
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_id ON workout_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_session_id ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_created_at ON workout_sets(created_at DESC);

-- user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unit TEXT DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  active_training_day_id UUID REFERENCES training_days(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read own settings
CREATE POLICY "Users can read own settings" ON user_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: authenticated users can insert own settings
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: authenticated users can update own settings
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Row-level security enforcement summary
-- The fundamental rule across ALL tables: user_id = auth.uid()
-- Never use public read/write policies. Security comes from Supabase Auth + RLS.
-- ============================================================
-- Profile creation trigger (auto-create profile on user signup)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  NEW.id = gen_random_uuid();
  NEW.created_at = now();
  NEW.updated_at = now();
  INSERT INTO profiles (id, display_name, email, avatar_url)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users on insert
CREATE TRIGGER on_auth_user_create
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();