# Local Database Setup Guide

## Quick Setup

Your `.env.local` file is currently pointing to Vercel Postgres. To switch to local PostgreSQL:

### Step 1: Create Local Database

```bash
# Try one of these, depending on your PostgreSQL setup:

# Option 1: Using default postgres user
createdb -U postgres tocbball

# Option 2: Using your system user
createdb tocbball

# Option 3: Using psql directly
psql -U postgres -c "CREATE DATABASE tocbball;"
```

### Step 2: Update .env.local

Create or update `.env.local` with your local database connection:

```bash
# Option 1: Default postgres user (if you have a password)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/tocbball"

# Option 2: Your system user (no password, peer auth)
DATABASE_URL="postgresql://$(whoami)@localhost:5432/tocbball"

# Option 3: Unix socket (if using peer auth)
DATABASE_URL="postgresql:///tocbball"
```

**Common scenarios:**

- **Homebrew PostgreSQL on macOS:**
  ```bash
  DATABASE_URL="postgresql://$(whoami)@localhost:5432/tocbball"
  ```

- **PostgreSQL with password:**
  ```bash
  DATABASE_URL="postgresql://postgres:password@localhost:5432/tocbball"
  ```

- **Docker PostgreSQL:**
  ```bash
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tocbball"
  ```

### Step 3: Push Schema to Local DB

```bash
npx prisma db push
```

### Step 4: Verify It's Working

```bash
npm run dev
```

The app should now use your local database!

---

## How It Works

- **Local Development:** Uses `.env.local` (gitignored) → Your local PostgreSQL
- **Vercel Production:** Uses environment variables from Vercel dashboard → Vercel Postgres

**Important:** `.env.local` is already in `.gitignore`, so it will never be committed. Vercel production automatically uses the `DATABASE_URL` environment variable you set in the Vercel dashboard (which you already connected when setting up the Prisma Postgres database).

---

## Troubleshooting

### "Database does not exist"
```bash
createdb tocbball
```

### "Role does not exist"
```bash
# Create a user (if needed)
psql postgres -c "CREATE USER $(whoami) WITH CREATEDB;"
createdb tocbball
```

### "Connection refused"
Make sure PostgreSQL is running:
```bash
# macOS with Homebrew
brew services start postgresql@14  # or your version

# Linux
sudo systemctl start postgresql
```
