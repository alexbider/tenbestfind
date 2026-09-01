#!/bin/sh
set -e

# Bring the database up to the schema on every boot. `db push` is idempotent, so
# a redeploy with no schema change is a no-op.
echo "→ applying the schema to ${DATABASE_URL}"
npx prisma db push --skip-generate

# Seed only when the database is empty. A redeploy must never overwrite content
# someone has edited, so seeding is a first-boot step and nothing more.
COUNT=$(node -e '
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
db.country
  .count()
  .then((n) => { console.log(n); return db.$disconnect(); })
  .catch(() => { console.log(0); });
' 2>/dev/null | tail -1)

if [ "${COUNT:-0}" = "0" ]; then
  echo "→ empty database, loading the seed content"
  npx tsx prisma/seed.ts
else
  echo "→ database already holds ${COUNT} countries, leaving it alone"
fi

echo "→ starting the site on port ${PORT:-3000}"
exec "$@"
