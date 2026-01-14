#!/bin/bash
# Helper script to set up local PostgreSQL for development

echo "=== Local PostgreSQL Setup ==="
echo ""

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo "✓ psql found: $(which psql)"
else
    echo "✗ PostgreSQL not found. Install it first:"
    echo "  brew install postgresql@14"
    echo "  brew services start postgresql@14"
    exit 1
fi

# Check common connection methods
echo ""
echo "Trying to connect to PostgreSQL..."
echo ""

# Try default postgres user
if psql -U postgres -c "SELECT 1" &> /dev/null; then
    echo "✓ Can connect as 'postgres' user"
    PGUSER="postgres"
elif psql -U $(whoami) -c "SELECT 1" &> /dev/null; then
    echo "✓ Can connect as '$(whoami)' user"
    PGUSER=$(whoami)
elif psql -d postgres -c "SELECT 1" &> /dev/null; then
    echo "✓ Can connect via peer auth (unix socket)"
    PGUSER=$(whoami)
else
    echo "✗ Cannot connect to PostgreSQL"
    echo ""
    echo "You may need to:"
    echo "1. Start PostgreSQL: brew services start postgresql@14"
    echo "2. Create a PostgreSQL user: createuser -s $(whoami)"
    echo "3. Or provide a connection string manually"
    exit 1
fi

# Create database
echo ""
echo "Creating database 'tocbball'..."
if createdb tocbball 2>/dev/null || psql -U $PGUSER -d postgres -c "CREATE DATABASE tocbball;" &> /dev/null; then
    echo "✓ Database 'tocbball' created"
else
    echo "✗ Failed to create database (may already exist)"
fi

echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Update .env.local with your DATABASE_URL:"
if [ "$PGUSER" = "postgres" ]; then
    echo '   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/tocbball"'
else
    echo "   DATABASE_URL=\"postgresql://$PGUSER@localhost:5432/tocbball\""
fi
echo ""
echo "2. Push the schema:"
echo "   npx prisma db push"
echo ""
