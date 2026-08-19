# Cultura Team Portal — Full Stack

This project converts the uploaded single-file Cultura prototype into a real Node.js + PostgreSQL application.

## Stack
- Frontend: HTML/CSS/JavaScript
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: JWT + bcrypt
- Real-time foundation: Socket.IO
- File uploads: Supabase Storage

## Project structure

cultura-fullstack/
  frontend/index.html
  backend/
    src/server.js
    src/schema.sql
    package.json
    schema.sql
    seed.js
    .env.example
    uploads/

## 1. Create the database

Install PostgreSQL, then create a database named `cultura`.

Example with psql:

    createdb cultura

Or:

    psql -U postgres
    CREATE DATABASE cultura;

## 2. Configure backend

    cd backend
    copy .env.example .env

Edit `.env`:

    DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/cultura
    JWT_SECRET=replace-with-a-long-random-secret
    PORT=4000

On Linux/macOS use `cp .env.example .env`.

## 3. Install and seed

    cd backend
    npm install
    node seed.js

This creates the tables and demo data.

Demo accounts:
- Admin: admin@cultura.local / Admin@123
- Member: member@cultura.local / Member@123

## 4. Start

    npm start

Open:

    http://localhost:4000

## Important

The old version stored application data in browser localStorage. The new version stores users, groups, attendance, competitions, announcements and messages in PostgreSQL.

Passwords are stored as bcrypt hashes and login uses JWT authentication.

## Production

Before internet deployment:
1. Use a strong random JWT_SECRET.
2. Use HTTPS.
3. Put PostgreSQL behind appropriate network controls.
4. Add rate limiting and email/password reset.
5. Configure a persistent object-storage provider for production file uploads.
6. Set a production CORS origin.


## Supabase Storage

Run `backend/supabase-storage.sql` in your Supabase SQL editor, then set:

    SUPABASE_URL=https://YOUR_PROJECT.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
    SUPABASE_STORAGE_BUCKET=cultura-files

The service-role key must stay on the backend. Do not put it in frontend JavaScript or GitHub source files.
