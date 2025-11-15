#!/bin/bash
# Script to fix migration 033 state after failure
# This checks if the enum value was added and fixes the database state

set -e

cd "$(dirname "$0")"

# Load environment variables
if [ -f ../../.env ]; then
  export $(cat ../../.env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-memoriae}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-}

# Check if we're in Docker
if [ -n "$DATABASE_URL" ]; then
  CONNECTION_STRING="$DATABASE_URL"
else
  CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo "Checking migration 033 state..."

# Connect and check if enum value exists
psql "$CONNECTION_STRING" <<EOF
-- Check if add_sprout enum value exists
DO \$\$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'add_sprout' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'seed_transaction_type')
  ) THEN
    RAISE NOTICE 'Enum value add_sprout already exists';
  ELSE
    RAISE NOTICE 'Enum value add_sprout does not exist';
  END IF;
END
\$\$;

-- Check if column is text or enum
SELECT 
  data_type,
  CASE 
    WHEN data_type = 'USER-DEFINED' THEN 'enum'
    ELSE data_type
  END as actual_type
FROM information_schema.columns
WHERE table_name = 'seed_transactions' 
  AND column_name = 'transaction_type';
EOF

echo ""
echo "If the column is already text type, you can safely rebuild and re-run migrations."
echo "If the enum value was added but migration failed, you may need to manually fix."

