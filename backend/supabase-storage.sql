-- Run this in the Supabase SQL editor.
-- The backend uses the service-role key, so it can upload to the private bucket.
-- Keep SUPABASE_SERVICE_ROLE_KEY ONLY on the Node.js server / Render environment.
insert into storage.buckets (id, name, public)
values ('cultura-files', 'cultura-files', false)
on conflict (id) do nothing;

-- No public policies are required for a private bucket when the server uses service_role.
