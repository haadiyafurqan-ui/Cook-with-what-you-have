-- Cook With What You Have: community board
-- Run this whole file once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- It is safe to read before running. Nothing here touches anything outside your own project.

-- ---------------------------------------------------------------------------
-- 1. People
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  created_at   timestamptz not null default now()
);

-- Display names must be unique (ignoring upper/lower case) so nobody can pose as someone else.
create unique index if not exists profiles_name_unique on public.profiles (lower(display_name));

-- Moderators are added by hand in the SQL editor (see COMMUNITY_SETUP.md). Nobody can add
-- themselves: there is deliberately no insert/update policy on this table.
create table if not exists public.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderators m where m.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 2. Posts, replies, likes, reports
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null check (kind in ('photo', 'question')),
  title         text check (title is null or char_length(title) between 3 and 140),
  body          text not null check (char_length(body) between 3 and 1000),
  image_path    text,
  tags          text[] not null default '{}' check (cardinality(tags) <= 3),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  best_reply_id uuid,
  created_at    timestamptz not null default now(),
  constraint question_needs_title check (kind <> 'question' or title is not null),
  constraint photo_needs_image check (kind <> 'photo' or image_path is not null)
);
create index if not exists posts_feed_idx on public.posts (status, kind, created_at desc);

create table if not exists public.replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists replies_post_idx on public.replies (post_id, created_at);

do $$ begin
  alter table public.posts
    add constraint posts_best_reply_fk foreign key (best_reply_id) references public.replies(id) on delete set null;
exception when duplicate_object then null;
end $$;

create table if not exists public.likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  reply_id   uuid references public.replies(id) on delete cascade,
  reason     text check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  constraint report_target check ((post_id is not null) <> (reply_id is not null)),
  unique (user_id, post_id),
  unique (user_id, reply_id)
);

-- Once 3 different people report something it is taken down until a moderator looks at it:
-- a reply is hidden, a post goes back to 'pending'. A moderator can restore it in the Table editor.
create or replace function public.auto_hide_reported_reply()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.reply_id is not null
     and (select count(*) from public.reports r where r.reply_id = new.reply_id) >= 3 then
    update public.replies set hidden = true where id = new.reply_id;
  end if;
  if new.post_id is not null
     and (select count(*) from public.reports r where r.post_id = new.post_id) >= 3 then
    update public.posts set status = 'pending' where id = new.post_id and status = 'approved';
  end if;
  return new;
end $$;
drop trigger if exists reports_auto_hide on public.reports;
create trigger reports_auto_hide after insert on public.reports
  for each row execute function public.auto_hide_reported_reply();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security: who may do what
-- ---------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.moderators enable row level security;
alter table public.posts      enable row level security;
alter table public.replies    enable row level security;
alter table public.likes      enable row level security;
alter table public.reports    enable row level security;

-- Profiles: names are public (that is what other cooks see). You can only create/edit your own.
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Posts: everyone sees approved posts. You see your own posts (even pending). Moderators see all.
-- New posts are always created as 'pending'; only a moderator can approve.
drop policy if exists posts_read   on public.posts;
drop policy if exists posts_insert on public.posts;
drop policy if exists posts_delete on public.posts;
drop policy if exists posts_mod_update on public.posts;
create policy posts_read on public.posts for select
  using (status = 'approved' or user_id = auth.uid() or public.is_moderator());
create policy posts_insert on public.posts for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and best_reply_id is null);
create policy posts_delete on public.posts for delete to authenticated
  using (user_id = auth.uid() or public.is_moderator());
create policy posts_mod_update on public.posts for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- Replies: visible if not hidden and the post is visible to you. Anyone signed in may reply to an
-- approved post. You can delete your own.
drop policy if exists replies_read   on public.replies;
drop policy if exists replies_insert on public.replies;
drop policy if exists replies_delete on public.replies;
drop policy if exists replies_mod_update on public.replies;
create policy replies_read on public.replies for select
  using (
    (hidden = false or public.is_moderator() or user_id = auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id
                and (p.status = 'approved' or p.user_id = auth.uid() or public.is_moderator()))
  );
create policy replies_insert on public.replies for insert to authenticated
  with check (
    user_id = auth.uid() and hidden = false
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
  );
create policy replies_delete on public.replies for delete to authenticated
  using (user_id = auth.uid() or public.is_moderator());
create policy replies_mod_update on public.replies for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- Likes: you can see and manage only your own (public counts come from post_like_counts below),
-- and only on approved posts.
drop policy if exists likes_read   on public.likes;
drop policy if exists likes_insert on public.likes;
drop policy if exists likes_delete on public.likes;
create policy likes_read   on public.likes for select to authenticated using (user_id = auth.uid());
create policy likes_insert on public.likes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved'));
create policy likes_delete on public.likes for delete to authenticated using (user_id = auth.uid());

-- Reports: you can file one; only moderators can read them.
drop policy if exists reports_insert on public.reports;
drop policy if exists reports_read   on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (user_id = auth.uid());
create policy reports_read   on public.reports for select to authenticated using (public.is_moderator());

-- ---------------------------------------------------------------------------
-- 3b. Spam brakes: at most 5 posts per person per day and 30 replies per hour
-- ---------------------------------------------------------------------------
create or replace function public.limit_post_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.posts where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have reached today''s posting limit. Please try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists posts_rate_limit on public.posts;
create trigger posts_rate_limit before insert on public.posts
  for each row execute function public.limit_post_rate();

create or replace function public.limit_reply_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.replies where user_id = new.user_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'You are replying very quickly. Please wait a little and try again.';
  end if;
  return new;
end $$;
drop trigger if exists replies_rate_limit on public.replies;
create trigger replies_rate_limit before insert on public.replies
  for each row execute function public.limit_reply_rate();

-- ---------------------------------------------------------------------------
-- 4. Marking the best answer (only the person who asked can do it)
-- ---------------------------------------------------------------------------
create or replace function public.mark_best_answer(p_post uuid, p_reply uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.posts where id = p_post and user_id = auth.uid() and kind = 'question') then
    raise exception 'Only the person who asked can choose the best answer';
  end if;
  if not exists (select 1 from public.replies where id = p_reply and post_id = p_post and user_id <> auth.uid() and hidden = false) then
    raise exception 'That reply cannot be chosen';
  end if;
  update public.posts set best_reply_id = p_reply where id = p_post;
end $$;
revoke all on function public.mark_best_answer(uuid, uuid) from public, anon;
grant execute on function public.mark_best_answer(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Top 3 cooks this week
-- Points (last 7 days, approved/visible content only, never your own likes):
--   2 per approved post,  1 per like your posts received,  5 per reply chosen as best answer
-- ---------------------------------------------------------------------------
create or replace function public.top_cooks_this_week()
returns table (display_name text, points integer)
language sql stable security definer set search_path = public as $$
  with since as (select now() - interval '7 days' as t),
  pts as (
    select p.user_id, 2 as n from public.posts p, since
      where p.status = 'approved' and p.created_at >= since.t
    union all
    select p.user_id, 1 from public.likes l
      join public.posts p on p.id = l.post_id, since
      where p.status = 'approved' and l.created_at >= since.t and l.user_id <> p.user_id
    union all
    select r.user_id, 5 from public.posts q
      join public.replies r on r.id = q.best_reply_id, since
      where q.status = 'approved' and r.hidden = false and r.created_at >= since.t and r.user_id <> q.user_id
  )
  select pr.display_name, sum(pts.n)::integer as points
  from pts join public.profiles pr on pr.id = pts.user_id
  group by pr.id, pr.display_name
  order by points desc, min(pr.created_at) asc
  limit 3;
$$;
grant execute on function public.top_cooks_this_week() to anon, authenticated;

-- Like counts and reply counts without exposing who liked what.
create or replace function public.post_like_counts(p_ids uuid[])
returns table (post_id uuid, n integer)
language sql stable security definer set search_path = public as $$
  select l.post_id, count(*)::integer from public.likes l where l.post_id = any (p_ids) group by l.post_id;
$$;
grant execute on function public.post_like_counts(uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5b. Let people delete their own account and everything they posted
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();   -- cascades to profile, posts, replies, likes, reports
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Photos: a public bucket, 5 MB per file, JPEG/PNG/WebP only
--    Anyone can view a photo if they know its (random) address; only signed-in people can upload,
--    and only into a folder named after their own user id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists photos_insert on storage.objects;
drop policy if exists photos_delete on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()));
