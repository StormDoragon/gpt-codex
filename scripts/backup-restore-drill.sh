#!/usr/bin/env bash
# Backup/restore drill.
#
# Dumps the database at DATABASE_URL, restores the dump into a brand-new scratch
# database, and proves the restored copy is identical: the same tables with the
# same row counts and the same content checksum, and the same number of
# constraints and indexes. Exits non-zero on any difference.
#
# A backup you have never restored is a hope, not a backup. Run this before you
# rely on one, after any schema change, and on a schedule.
#
#   DATABASE_URL=postgres://user:pass@host:5432/dbname npm run db:drill
#
# Needs pg_dump, pg_restore and psql (version >= the server's), and a role that
# may CREATE DATABASE. Set DRILL_ADMIN_URL if that role differs from DATABASE_URL's.
# It only ever READS the source database. The scratch database is dropped at the end.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL (the database to back up) is required}"
for tool in pg_dump pg_restore psql; do
  command -v "$tool" >/dev/null || { echo "missing required tool: $tool" >&2; exit 2; }
done

ADMIN_URL="${DRILL_ADMIN_URL:-$DATABASE_URL}"
SCRATCH="drill_restore_$(date +%s)_$$"
SCRATCH_URL="$(printf '%s' "$DATABASE_URL" | sed -E "s#(postgres(ql)?://[^/]+/)[^?]*#\1${SCRATCH}#")"
WORK="$(mktemp -d)"
DUMP="$WORK/backup.dump"

cleanup() {
  psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS \"$SCRATCH\"" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

# One line per table: name | rows | checksum of every row's text, plus schema object counts.
FINGERPRINT=$(cat <<'SQL'
SELECT format('%I.%I', table_schema, table_name) || ' | rows=' ||
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text ||
  ' | md5=' ||
  (xpath('/row/h/text()', query_to_xml(format('select md5(coalesce(string_agg(x::text, '','' order by x::text), '''')) as h from %I.%I x', table_schema, table_name), false, true, '')))[1]::text
FROM information_schema.tables
WHERE table_schema IN ('public', 'drizzle') AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'constraints (public) | ' || count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public'
UNION ALL
SELECT 'indexes (public) | ' || count(*) FROM pg_indexes WHERE schemaname = 'public'
ORDER BY 1;
SQL
)

echo "1/5 Dumping the source database (read-only)..."
pg_dump --format=custom --no-owner --no-privileges --file "$DUMP" "$DATABASE_URL"
echo "    backup size: $(du -h "$DUMP" | cut -f1)"

echo "2/5 Creating scratch database $SCRATCH..."
psql "$ADMIN_URL" -q -c "CREATE DATABASE \"$SCRATCH\""

echo "3/5 Restoring into the scratch database..."
pg_restore --no-owner --no-privileges --dbname "$SCRATCH_URL" "$DUMP"

echo "4/5 Fingerprinting both databases..."
SOURCE_PRINT="$(psql "$DATABASE_URL" -At -c "$FINGERPRINT")"
RESTORED_PRINT="$(psql "$SCRATCH_URL" -At -c "$FINGERPRINT")"

echo "5/5 Comparing..."
if [ "$SOURCE_PRINT" = "$RESTORED_PRINT" ]; then
  echo
  echo "$RESTORED_PRINT" | sed 's/^/    /'
  echo
  echo "PASS: the restored database is identical to the source."
else
  echo
  echo "FAIL: the restored database differs from the source:" >&2
  diff <(echo "$SOURCE_PRINT") <(echo "$RESTORED_PRINT") >&2 || true
  exit 1
fi
