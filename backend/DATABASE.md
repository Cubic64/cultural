# Database

Tables:
- users (now includes registration profile fields — father_name, mother_name,
  course_name, gender, roll_number, contact_number, dob — and document paths —
  timetable_path, fees_receipt_path, bonafide_path, id_card_path)
- groups
- user_groups
- competitions
- announcements
- attendance
- messages
- competition_registrations
- announcement_reads
- alumni (passout students directory: who they were on the team and what they
  do now)

Relationships:
users 1--N attendance
groups 1--N attendance
users N--N groups through user_groups
groups 1--N messages
users 1--N messages
users 1--N groups as optional leader
users N--N competitions through competition_registrations
users N--N announcements through announcement_reads

## Upgrading an existing database

`schema.sql` is idempotent: every `CREATE TABLE` uses `IF NOT EXISTS` and the
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements at the bottom of the file
upgrade a database that was created before the registration/profile/document/
alumni features existed. Running `node seed.js` again (or just re-running
`schema.sql`) against an existing database is safe and will not touch or
duplicate existing data.

If you'd rather not re-run `seed.js` (which also inserts demo rows), run
`registration-profile-alumni-migration.sql` directly in the Supabase SQL
Editor — it only adds the new columns/tables and is also safe to run more
than once.
