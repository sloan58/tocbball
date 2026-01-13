# Quick Start: Deploy to Vercel

## Prerequisites
- Code pushed to GitHub/GitLab/Bitbucket
- Vercel account (free at https://vercel.com)

## Deployment Steps

### 1. Push Your Code to Git
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to https://vercel.com and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Vercel will auto-detect Next.js ✅

### 3. Add Vercel Postgres Database
1. In your Vercel project dashboard, go to the **"Storage"** tab
2. Click **"Create Database"** → Select **"Postgres"**
3. Choose a name (e.g., "tocbball-db")
4. Select a region (closest to your users)
5. Click **"Create"**

✅ **Vercel automatically sets `DATABASE_URL` - you don't need to do anything!**

### 4. Deploy!
1. Click **"Deploy"** in Vercel dashboard
2. Wait 1-2 minutes for build to complete
3. Your app is live! 🎉

## What Happens Automatically

- ✅ Prisma Client is generated (`postinstall` script)
- ✅ Database migrations run (`prisma migrate deploy` in build script)
- ✅ Next.js builds and deploys
- ✅ `DATABASE_URL` is automatically configured

## Verify It Works

1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. Create a new team
3. Add players and games
4. Everything should work! 🎉

## Troubleshooting

**Build fails?** Check the build logs in Vercel dashboard - they'll show the exact error.

**Database connection error?** Make sure Vercel Postgres is created and running in the Storage tab.

**Migrations not running?** The build script includes `prisma migrate deploy` - check build logs to confirm it ran.

## Cost

- **Free tier**: 100GB bandwidth/month + 256MB Postgres storage
- **Total**: $0/month for low-to-medium traffic
