-- Enable real-time functionality for calendar_events table

-- 1. First make sure the table exists
-- This is just a check, you should have already created the table using create_calendar_events_table.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'calendar_events'
  ) THEN
    RAISE EXCEPTION 'calendar_events table does not exist, please run create_calendar_events_table.sql first';
  END IF;
END
$$;

-- 2. Enable row-level security if not already enabled
ALTER TABLE IF EXISTS public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 3. Create a publication for the calendar_events table for real-time functionality
DROP PUBLICATION IF EXISTS calendar_events_publication;
CREATE PUBLICATION calendar_events_publication FOR TABLE public.calendar_events;

-- 4. Grant necessary permissions to authenticated and anonymous users
GRANT SELECT ON public.calendar_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;

-- 5. Grant necessary permissions for the auto-generated ID (if using uuid_generate_v4)
GRANT USAGE ON SEQUENCE public.calendar_events_id_seq TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Real-time functionality enabled for calendar_events table';
END
$$; 