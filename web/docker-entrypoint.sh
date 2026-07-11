#!/bin/sh
set -e

echo "Waiting for database..."
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => client.end()).catch(() => process.exit(1));
"; do
  sleep 1
done
echo "Database is up."

npx prisma migrate deploy
npx prisma db seed

exec "$@"
