#!/bin/bash
# Script to set up local PostgreSQL database for development

echo "Setting up local PostgreSQL database for development..."

# Check if database exists
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw tocbball; then
    echo "✓ Database 'tocbball' already exists"
else
    echo "Creating database 'tocbball'..."
    createdb tocbball 2>/dev/null || psql -c 'CREATE DATABASE tocbball;' 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Database created"
    else
        echo "✗ Failed to create database. Make sure PostgreSQL is running and you have permissions."
        exit 1
    fi
fi

echo ""
echo "Next steps:"
echo "1. Create a .env.local file with your local DATABASE_URL:"
echo "   DATABASE_URL=\"postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/tocbball\""
echo ""
echo "2. Push the schema:"
echo "   npx prisma db push"
echo ""
echo "Note: .env.local is gitignored and only used for local development."
echo "      Vercel production uses environment variables from the Vercel dashboard."
