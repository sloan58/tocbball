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

Uses SQLite locally (in `prisma/dev.db`). To switch to PostgreSQL:

1. Update `prisma/schema.prisma` datasource to `provider = "postgresql"`
2. Set `DATABASE_URL` environment variable
3. Run `npx prisma db push`

## Next Steps

The API routes are complete and working. Frontend pages still need to be built, but the foundation is solid and tested.
