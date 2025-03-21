-- Create a new table for calendar events
create table if not exists public.calendar_events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  date timestamp with time zone not null,
  event_type text not null check (event_type in ('holiday', 'event', 'reminder')),
  employee_id uuid references public.employees(id),
  is_holiday boolean default false,
  is_trinidad_holiday boolean default false,
  year integer,
  color text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add RLS policies
alter table public.calendar_events enable row level security;

-- Allow anyone to read calendar events
create policy "Anyone can read calendar_events"
  on public.calendar_events
  for select
  to anon, authenticated
  using (true);

-- Only authenticated users can insert/update/delete calendar events
create policy "Authenticated users can insert calendar_events"
  on public.calendar_events
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update calendar_events"
  on public.calendar_events
  for update
  to authenticated
  using (true);

create policy "Authenticated users can delete calendar_events"
  on public.calendar_events
  for delete
  to authenticated
  using (true);

-- Create functions to handle updated_at field for events
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to update the updated_at field
create trigger set_updated_at
before update on public.calendar_events
for each row
execute function public.handle_updated_at(); 