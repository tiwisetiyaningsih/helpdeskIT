#!/bin/sh
set -e

echo "Menjalankan migrasi database..."
bunx prisma migrate deploy

echo "Menjalankan server..."
exec "$@"