#!/bin/sh
# Күнделікті сақтық көшірме: деректерді қысып, 30 күн сақтайды.
# Cron (root): 30 2 * * *  /srv/naukas/backup.sh
SRC="$(dirname "$0")/data"
DST="${BACKUP_DIR:-$(dirname "$0")/backups}"
mkdir -p "$DST"
cp "$SRC/db.json" "$DST/db_$(date +%F_%H%M).json" 2>/dev/null
[ -s "$SRC/journal.ndjson" ] && cp "$SRC/journal.ndjson" "$DST/journal_$(date +%F_%H%M).ndjson"
gzip -f "$DST"/db_*.json "$DST"/journal_*.ndjson 2>/dev/null
find "$DST" -type f -mtime +30 -delete
