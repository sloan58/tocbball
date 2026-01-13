# Deploy to Vercel - Step by Step

## Quick Summary

Your app is **ready to deploy**! Here's what you need to do:

## Step 1: Push Code to Git

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

## Step 2: Connect to Vercel

1. Go to https://vercel.com and **sign in** (or create free account)
2. Click **"Add New..."** → **"Project"**
3. **Import your Git repository**
4. Vercel will auto-detect Next.js ✅ - keep default settings

## Step 3: Add Vercel Postgres

1. In your Vercel project, go to **"Storage"** tab
2. Click **"Create Database"** → Select **"Postgres"**
3. Name it (e.g., "tocbball-db")
4. Choose region (closest to users)
5. Click **"Create"**

✅ **Vercel automatically sets `DATABASE_URL` - nothing else needed!**

## Step 4: Configure Build (Optional Check)

Vercel should auto-detect everything, but verify:

1. Go to **"Settings"** → **"General"**
2. **Build Command**: Should be `npm run build` (which includes `prisma generate`)
3. **Output Directory**: `.next` (default)

## Step 5: Deploy!

1. Click **"Deploy"** button
2. Wait 1-2 minutes
3. Your app is live! 🎉

## Step 6: Initialize Database Schema

After first deployment, you need to create the database tables:

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Pull environment variables (includes DATABASE_URL)
vercel env pull .env.local

# Push schema to database
npx prisma db push
```

### Option B: Using Vercel Dashboard

1. Go to your project → **"Settings"** → **"Build & Development Settings"**
2. Update **Build Command** to:
   ```
   prisma generate && npx prisma db push && next build
   ```
3. Click **"Redeploy"**

**Note**: After first deployment, you can change the build command back to `npm run build` since the schema will already exist.

## Verify It Works

1. Visit your Vercel URL
2. Create a new team
3. Add players and games
4. Everything should work! ✅

## Troubleshooting

**Build fails?**
- Check build logs in Vercel dashboard
- Make sure `DATABASE_URL` is set (should be automatic)

**Database connection error?**
- Verify Vercel Postgres is created and running
- Check that `DATABASE_URL` is in Environment Variables

**Schema not created?**
- Run `npx prisma db push` using Vercel CLI (see Step 6)

## Cost

- **Free tier**: 100GB bandwidth/month + 256MB Postgres storage
- **Total**: $0/month for low-to-medium traffic
