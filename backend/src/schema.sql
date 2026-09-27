
CREATE TABLE IF NOT EXISTS users (
 id SERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
 father_name TEXT DEFAULT '',
 mother_name TEXT DEFAULT '',
 course_name TEXT DEFAULT '',
 gender TEXT DEFAULT '',
 roll_number TEXT,
 contact_number TEXT DEFAULT '',
 dob DATE,
 timetable_path TEXT,
 fees_receipt_path TEXT,
 bonafide_path TEXT,
 id_card_path TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS groups (
 id SERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 description TEXT DEFAULT '',
 leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_groups (
 user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
 group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,group_id)
);
CREATE TABLE IF NOT EXISTS competitions (
 id SERIAL PRIMARY KEY,
 title TEXT NOT NULL,
 date DATE NOT NULL,
 time TIME,
 venue TEXT,
 description TEXT DEFAULT '',
 document_url TEXT DEFAULT '',
 registration_deadline DATE,
 max_participants INTEGER,
 result TEXT DEFAULT '',
 winner TEXT DEFAULT '',
 status TEXT DEFAULT 'upcoming',
 document_path TEXT,
 image_path TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS announcements (
 id SERIAL PRIMARY KEY,
 title TEXT NOT NULL,
 text TEXT NOT NULL,
 priority TEXT DEFAULT 'normal',
 pinned BOOLEAN DEFAULT false,
 attachment_path TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attendance (
 id SERIAL PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
 date DATE NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('present','late','absent')),
 UNIQUE(user_id,date)
);
CREATE TABLE IF NOT EXISTS messages (
 id SERIAL PRIMARY KEY,
 group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 text TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS competition_registrations (
 id BIGSERIAL PRIMARY KEY,
 competition_id BIGINT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(competition_id,user_id)
);
CREATE TABLE IF NOT EXISTS announcement_reads (
 id BIGSERIAL PRIMARY KEY,
 announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(announcement_id,user_id)
);
CREATE TABLE IF NOT EXISTS alumni (
 id SERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 course_name TEXT DEFAULT '',
 batch_year TEXT DEFAULT '',
 role_then TEXT DEFAULT '',
 current_work TEXT DEFAULT '',
 bio TEXT DEFAULT '',
 photo_path TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id,created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_comp_reg_comp ON competition_registrations(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_reg_user ON competition_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_ann_reads_ann ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_ann_reads_user ON announcement_reads(user_id);

-- The block below is safe to re-run against an existing database: it upgrades
-- tables that were created before the registration/profile/alumni features
-- existed, without touching any data already stored.
ALTER TABLE users ADD COLUMN IF NOT EXISTS father_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timetable_path TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fees_receipt_path TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonafide_path TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_path TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_roll_number ON users(roll_number) WHERE roll_number IS NOT NULL AND roll_number <> '';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS registration_deadline DATE;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS max_participants INTEGER;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS result TEXT DEFAULT '';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS winner TEXT DEFAULT '';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS document_path TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachment_path TEXT;

-- Attendance is now marked per user rather than per group. This block
-- upgrades a database created before that change, without losing any
-- existing attendance history.
ALTER TABLE attendance ALTER COLUMN group_id DROP NOT NULL;
-- If a user had more than one attendance row for the same date (one per
-- group, under the old model), keep only the most recently recorded one
-- so the new one-row-per-user-per-date rule can be enforced.
DELETE FROM attendance a USING attendance b
  WHERE a.user_id=b.user_id AND a.date=b.date AND a.id<b.id;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_user_id_group_id_date_key;
DO $$ BEGIN
  ALTER TABLE attendance ADD CONSTRAINT attendance_user_id_date_key UNIQUE(user_id,date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
