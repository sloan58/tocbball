# Database Reset Instructions

## Development Database (Local PostgreSQL)

You're currently using **local PostgreSQL** for development (configured in `.env.local`).

### Reset Local Database

**Option 1: Drop and recreate the database (cleanest)**
```bash
# Drop the database
dropdb tocbball

# Recreate it
createdb tocbball

# Push the schema
npx prisma db push
```

**Option 2: Reset using Prisma (if migrations exist)**
```bash
npx prisma migrate reset
```
This will drop the database, recreate it, and run all migrations.

**Option 3: Manual reset**
```bash
# Connect to the database
psql "postgresql://root@localhost:5432/tocbball"

# Drop all tables
DROP TABLE IF EXISTS "Game" CASCADE;
DROP TABLE IF EXISTS "Player" CASCADE;
DROP TABLE IF EXISTS "Coach" CASCADE;
DROP TABLE IF EXISTS "Team" CASCADE;

# Exit psql
\q

# Push schema again
npx prisma db push
```

---

## Production Database (Vercel Postgres)

### Reset Vercel Database

**Option 1: Using Vercel CLI (Recommended)**

```bash
# Pull production DATABASE_URL
vercel env pull .env.local --environment=production

# Reset using Prisma (if migrations exist)
DATABASE_URL="$(grep DATABASE_URL .env.local | cut -d'"' -f2)" npx prisma migrate reset
```

**Option 2: Using Prisma directly with DATABASE_URL**

```bash
# Get DATABASE_URL from Vercel
vercel env pull .env.local --environment=production

# Use the DATABASE_URL from .env.local
source .env.local 2>/dev/null || export $(grep DATABASE_URL .env.local | xargs)
npx prisma migrate reset
```

**Option 3: Drop and recreate via Vercel Dashboard**

1. Go to Vercel Dashboard → Your Project → Storage
2. Find your Prisma Postgres database
3. Delete the database
4. Create a new one
5. Reconnect it to your project
6. Run migrations: `npx prisma db push` (using the new DATABASE_URL)

**Option 4: Manual SQL reset (if you have direct access)**

```bash
# Pull DATABASE_URL
vercel env pull .env.local --environment=production

# Connect and drop tables
psql "$(grep DATABASE_URL .env.local | cut -d'"' -f2)" -c "
  DROP TABLE IF EXISTS \"Game\" CASCADE;
  DROP TABLE IF EXISTS \"Player\" CASCADE;
  DROP TABLE IF EXISTS \"Coach\" CASCADE;
  DROP TABLE IF EXISTS \"Team\" CASCADE;
"

# Push schema
npx prisma db push
```

---

## Quick Reference

- **Development**: Local PostgreSQL (`tocbball` database)
- **Production**: Vercel Postgres (Prisma Postgres instance)
