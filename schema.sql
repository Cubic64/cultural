
CREATE TABLE IF NOT EXISTS users (
 id SERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
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
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS announcements (
 id SERIAL PRIMARY KEY,
 title TEXT NOT NULL,
 text TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attendance (
 id SERIAL PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
 date DATE NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('present','late','absent')),
 UNIQUE(user_id,group_id,date)
);
CREATE TABLE IF NOT EXISTS messages (
 id SERIAL PRIMARY KEY,
 group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 text TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id,created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
