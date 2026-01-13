# Deployment Guide: Vercel + Vercel Postgres

This guide walks you through deploying the Youth Basketball Playing-Time Scheduler to Vercel with PostgreSQL.

## Prerequisites

- GitHub account (or GitLab/Bitbucket)
- Vercel account (sign up at https://vercel.com - it's free)
- Your code pushed to a Git repository

## Step 1: Push Code to Git

```bash
# Make sure your code is committed and pushed
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Step 2: Connect to Vercel

1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js - keep the default settings

## Step 3: Add Vercel Postgres Database

1. In your Vercel project dashboard, go to the "Storage" tab
2. Click "Create Database" → Select "Postgres"
3. Choose a name for your database (e.g., "tocbball-db")
4. Select a region (choose closest to your users)
5. Click "Create"

**Important**: Vercel will automatically set the `DATABASE_URL` environment variable. You don't need to do anything else!

## Step 4: Configure Build Settings

Vercel should automatically detect Next.js, but verify these settings:

1. Go to "Settings" → "General"
2. **Framework Preset**: Next.js (auto-detected)
3. **Build Command**: `prisma generate && next build` (already in package.json)
4. **Output Directory**: `.next` (default)
5. **Install Command**: `npm install` (default)

## Step 5: Run Database Migrations

After your first deployment, you need to run Prisma migrations:

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy
```

### Option B: Using Vercel Dashboard

1. Go to your project → "Settings" → "Build & Development Settings"
2. Add a new build command override:
   ```
   prisma generate && npx prisma migrate deploy && next build
   ```
3. Redeploy your project

## Step 6: Deploy!

1. Click "Deploy" in Vercel dashboard
2. Wait for the build to complete (usually 1-2 minutes)
3. Your app will be live at `https://your-project.vercel.app`

## Environment Variables

Vercel automatically manages these for you:
- `DATABASE_URL` - Automatically set when you create Vercel Postgres

If you need to add custom environment variables:
1. Go to "Settings" → "Environment Variables"
2. Add any additional variables you need

## Post-Deployment Checklist

- [ ] Verify the app loads at your Vercel URL
- [ ] Test creating a team
- [ ] Test creating players/games
- [ ] Verify database migrations ran successfully (check Vercel build logs)

## Troubleshooting

### Build Fails with "Prisma Client not generated"

**Solution**: The `postinstall` script in `package.json` should handle this. If it doesn't, verify your build command includes `prisma generate`.

### Database Connection Error

**Solution**: 
1. Verify `DATABASE_URL` is set in Vercel dashboard (Settings → Environment Variables)
2. Make sure Vercel Postgres database is created and running
3. Check that your Prisma schema uses `provider = "postgresql"`

### Migrations Not Running

**Solution**: 
1. Manually run `npx prisma migrate deploy` using Vercel CLI (see Step 5)
2. Or add `npx prisma migrate deploy` to your build command

## Local Development After Deployment

To develop locally with the production database:

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Pull environment variables: `vercel env pull .env.local`
4. Run `npx prisma generate`
5. Start dev server: `npm run dev`

**Note**: For local development, you might want to use a separate local PostgreSQL database or SQLite to avoid affecting production data.

## Cost

- **Vercel**: Free tier includes 100GB bandwidth/month, which is plenty for this app
- **Vercel Postgres**: Free tier includes 256MB storage, perfect for getting started
- **Total**: $0/month for low-to-medium traffic

If you need more:
- Vercel Pro: $20/month (includes more bandwidth and better performance)
- Vercel Postgres Pro: Starts at $20/month (includes backups, more storage)
