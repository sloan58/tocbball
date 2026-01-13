#!/bin/bash
# Helper script to set up PostgreSQL database for local development

echo "Setting up PostgreSQL database for tocbball..."
echo ""

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw tocbball; then
    echo "✓ Database 'tocbball' already exists"
else
    echo "Creating database 'tocbball'..."
    createdb tocbball || psql -c 'CREATE DATABASE tocbball;'
    echo "✓ Database created"
fi

echo ""
echo "Next steps:"
echo "1. Create a .env.local file with your DATABASE_URL"
echo "2. Example formats:"
echo "   - With password: DATABASE_URL=\"postgresql://postgres:password@localhost:5432/tocbball\""
echo "   - Peer auth (macOS): DATABASE_URL=\"postgresql:///tocbball\""
echo "   - Custom user: DATABASE_URL=\"postgresql://youruser:yourpass@localhost:5432/tocbball\""
echo ""
echo "3. Then run: npx prisma db push"
