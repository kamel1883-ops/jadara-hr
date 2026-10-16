#!/bin/sh
# Run from the existing deployment after copying the updated source, never .env/storage.
set -eu
umask 077
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
[ -f .env ] || { echo 'Missing existing .env; stop. Do not generate new keys.' >&2; exit 1; }
[ -d storage ] || { echo 'Missing existing storage directory; stop and locate the correct deployment.' >&2; exit 1; }
docker compose exec -T db pg_isready -U vault -d jadara_vault >/dev/null
backup="backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup"
docker compose exec -T db pg_dump -U vault -d jadara_vault -Fc > "$backup/database.dump"
[ -s "$backup/database.dump" ] || { echo 'Database backup failed; stopped.' >&2; exit 1; }
tar -czf "$backup/storage.tar.gz" storage
cp -p .env "$backup/environment"
docker compose build --no-cache vault
docker compose run --rm --no-deps vault node src/migrate.js
docker compose up -d --no-deps --force-recreate vault
docker compose exec -T vault node -e 'fetch("http://127.0.0.1:4000/health/ready",{headers:{"X-Vault-Key":process.env.VAULT_API_KEY}}).then(async r=>{if(!r.ok)process.exit(1);console.log(await r.text())}).catch(()=>process.exit(1))'
echo "Update finished. Protected backups: $backup. Confirm a real document opens in Jadara."