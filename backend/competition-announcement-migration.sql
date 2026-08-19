-- Cultura: Competitions + Announcements upgrade
-- Run once in Supabase SQL Editor.

alter table competitions
  add column if not exists registration_deadline date,
  add column if not exists max_participants integer,
  add column if not exists result text default '',
  add column if not exists winner text default '',
  add column if not exists status text default 'upcoming',
  add column if not exists document_path text,
  add column if not exists image_path text;

alter table announcements
  add column if not exists priority text default 'normal',
  add column if not exists pinned boolean default false,
  add column if not exists attachment_path text;

create table if not exists competition_registrations (
  id bigserial primary key,
  competition_id bigint not null references competitions(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  registered_at timestamptz not null default now(),
  unique (competition_id,user_id)
);

create table if not exists announcement_reads (
  id bigserial primary key,
  announcement_id bigint not null references announcements(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id,user_id)
);

create index if not exists idx_comp_reg_comp on competition_registrations(competition_id);
create index if not exists idx_comp_reg_user on competition_registrations(user_id);
create index if not exists idx_ann_reads_ann on announcement_reads(announcement_id);
create index if not exists idx_ann_reads_user on announcement_reads(user_id);
