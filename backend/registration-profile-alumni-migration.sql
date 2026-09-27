-- Cultura: Self-registration profile fields + documents + alumni upgrade
-- Run once in the Supabase SQL Editor (or via psql) against an existing database.
-- Safe to run more than once.

alter table users add column if not exists father_name text default '';
alter table users add column if not exists mother_name text default '';
alter table users add column if not exists course_name text default '';
alter table users add column if not exists gender text default '';
alter table users add column if not exists roll_number text;
alter table users add column if not exists contact_number text default '';
alter table users add column if not exists dob date;
alter table users add column if not exists timetable_path text;
alter table users add column if not exists fees_receipt_path text;
alter table users add column if not exists bonafide_path text;
alter table users add column if not exists id_card_path text;

-- Roll numbers are unique when set, but existing rows may not have one yet,
-- so the index only enforces uniqueness for non-empty values.
create unique index if not exists idx_users_roll_number
  on users(roll_number)
  where roll_number is not null and roll_number <> '';

create table if not exists alumni (
  id serial primary key,
  name text not null,
  course_name text default '',
  batch_year text default '',
  role_then text default '',
  current_work text default '',
  bio text default '',
  photo_path text,
  created_at timestamptz not null default now()
);
