# Persistent data and backups

## Where the data lives

The application database is PostgreSQL. Do **not** store live application data in the GitHub source files.

Recommended free setup:

- Website/backend: Render
- Database: Supabase PostgreSQL
- Source code: GitHub
- Encrypted database backups: private GitHub repository

The application already accepts a normal PostgreSQL `DATABASE_URL`, so you can use the connection string from Supabase without changing the database code.

## Why GitHub is not the live database

GitHub is designed for source control, not concurrent application database writes. Storing live member records in JSON/CSV files in GitHub would cause race conditions, slow writes, and privacy/security problems.

Instead, PostgreSQL is the live database and GitHub stores encrypted backups.

## Supabase setup

1. Create a Supabase project.
2. Open the Connect/database connection information.
3. Copy the PostgreSQL connection string.
4. Put it into Render as the `DATABASE_URL` environment variable.
5. Run `node seed.js` once against that database to create the tables and demo data.

Supabase Free currently includes a 500 MB Postgres database and 1 GB file storage. Free projects can be paused after about one week of low activity; pausing preserves the data and the project can be resumed. See the official Supabase pricing/docs for current limits.

## GitHub encrypted backups

The included workflow:

`.github/workflows/database-backup.yml`

creates an encrypted PostgreSQL backup every day and stores up to 30 encrypted backups in the repository.

### Add these GitHub repository secrets

Repository → Settings → Secrets and variables → Actions → New repository secret

`DATABASE_URL`
- Your Supabase PostgreSQL connection string.

`BACKUP_PASSPHRASE`
- A long random password used to encrypt the backup.

IMPORTANT:
- Never commit `DATABASE_URL`.
- Never commit `BACKUP_PASSPHRASE`.
- Keep the GitHub repository private.
- Do not lose the passphrase. Without it, encrypted backups cannot be restored.

### Test the backup

GitHub → Actions → Encrypted PostgreSQL Backup → Run workflow.

The first run should create:

`backups/cultura_YYYY-MM-DD_HH-MM-SS.dump.enc`

## Restore a backup

On a trusted computer:

1. Download the encrypted `.dump.enc` file.
2. Decrypt it:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in cultura_YYYY-MM-DD_HH-MM-SS.dump.enc \
  -out cultura.dump \
  -pass pass:YOUR_BACKUP_PASSPHRASE
```

3. Restore it to PostgreSQL:

```bash
pg_restore --clean --if-exists \
  --no-owner --no-privileges \
  -d "YOUR_DATABASE_URL" cultura.dump
```

## Files

For important uploaded files, use persistent object storage (such as Supabase Storage) rather than Render's local filesystem. Render web-service files can disappear when the service is replaced/restarted.

The current project has an upload endpoint, but the next production improvement should move that endpoint to Supabase Storage so uploaded competition documents and member files are persistent too.
