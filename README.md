# Youth Basketball Playing-Time Scheduler

Simple Next.js app for managing youth basketball team playing time schedules.

## ✅ Status

**Working!** The app builds successfully and is ready to run.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run development server
npm run dev
```

Then open http://localhost:3000

## Tech Stack

- **Framework**: Next.js 16 (App Router) with API routes
- **Database**: SQLite (via Prisma) - can easily switch to PostgreSQL
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (recommended) or any Node.js host

## Features

- ✅ Team code authentication (view mode)
- ✅ Admin PIN authentication (edit mode)
- ✅ Player/coach management
- ✅ Game attendance tracking
- ✅ 8-period playing time schedule generation

## Database

Uses PostgreSQL for both local development and production (Vercel).

### Local Development Setup

1. **Create a PostgreSQL database** (if you haven't already):
   ```bash
   createdb tocbball
   # Or using psql:
   psql -c 'CREATE DATABASE tocbball;'
   ```

2. **Set up your database connection**:
   
   Create a `.env.local` file in the project root (or update your existing `.env` file):
   ```bash
   DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/tocbball"
   ```
   
   Common examples:
   - Default PostgreSQL user: `postgresql://postgres:password@localhost:5432/tocbball`
   - Unix socket (if using peer auth): `postgresql:///tocbball`
   - Custom user: `postgresql://myuser:mypassword@localhost:5432/tocbball`

3. **Initialize the database schema**:
   ```bash
   npx prisma db push
   ```
   
   This creates all the tables in your local database.

4. **Start developing**:
   ```bash
   npm run dev
   ```

### Production (Vercel)

The app is configured for Vercel + Vercel Postgres:
1. Vercel automatically detects Next.js projects
2. Add "Vercel Postgres" from the Vercel dashboard
3. Vercel automatically sets the `DATABASE_URL` environment variable
4. Run `npx prisma migrate deploy` in Vercel's build settings or via CLI

## Next Steps

The API routes are complete and working. Frontend pages still need to be built, but the foundation is solid and tested.
