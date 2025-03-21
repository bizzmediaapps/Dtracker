-- PART 1: Create the calendar_events table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  date timestamp with time zone NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('holiday', 'event', 'reminder')),
  employee_id uuid REFERENCES public.employees(id),
  is_holiday boolean DEFAULT false,
  is_trinidad_holiday boolean DEFAULT false,
  year integer,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- PART 2: Restart Row Level Security (RLS) policies from scratch
ALTER TABLE public.calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- First, drop any existing policies
DROP POLICY IF EXISTS "Anyone can read calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Anyone can insert calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Anyone can update calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Anyone can delete calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Public access to calendar_events" ON public.calendar_events;

-- Create a simplified all-access policy for all operations
CREATE POLICY "Public access to calendar_events"
  ON public.calendar_events
  USING (true)
  WITH CHECK (true);

-- PART 3: Create functions to handle updated_at field for events
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the updated_at field
DROP TRIGGER IF EXISTS set_updated_at ON public.calendar_events;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- PART 4: Enable real-time functionality
-- Create a publication for the calendar_events table
DROP PUBLICATION IF EXISTS calendar_events_publication;
CREATE PUBLICATION calendar_events_publication FOR TABLE public.calendar_events;

-- PART 5: Grant necessary permissions
GRANT ALL ON public.calendar_events TO anon, authenticated;

-- Grant sequence usage (required for auto-generated IDs)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_sequences
    WHERE schemaname = 'public'
    AND sequencename = 'calendar_events_id_seq'
  ) THEN
    EXECUTE 'GRANT USAGE ON SEQUENCE public.calendar_events_id_seq TO anon, authenticated';
  END IF;
END
$$;

-- Provide feedback on completion
DO $$
BEGIN
  RAISE NOTICE 'Calendar events table created and real-time functionality enabled successfully';
END
$$; 