-- Cook With What You Have: feedback box
-- Run this whole file once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it after schema.sql (it uses the moderators list from there). Safe to run again.
--
-- Anyone can send feedback, signed in or not. Nobody can read it back through the website:
-- only moderators (you) can, and you read it in Table editor > feedback.

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'idea' check (kind in ('bug', 'dish', 'idea', 'other')),
  message    text not null check (char_length(message) between 3 and 2000),
  email      text check (email is null or (char_length(email) between 3 and 200 and email like '%_@_%')),
  lang       text check (lang is null or lang in ('en', 'ru')),
  created_at timestamptz not null default now()
);
create index if not exists feedback_new_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists feedback_insert on public.feedback;
drop policy if exists feedback_read   on public.feedback;
drop policy if exists feedback_delete on public.feedback;
create policy feedback_insert on public.feedback for insert to anon, authenticated with check (true);
create policy feedback_read   on public.feedback for select to authenticated using (public.is_moderator());
create policy feedback_delete on public.feedback for delete to authenticated using (public.is_moderator());

grant insert on public.feedback to anon, authenticated;

-- Spam brake: the whole site accepts at most 20 messages every 10 minutes.
create or replace function public.limit_feedback_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feedback where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Lots of people are sending feedback right now. Please try again in a few minutes.';
  end if;
  return new;
end $$;
drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit before insert on public.feedback
  for each row execute function public.limit_feedback_rate();
