#!/usr/bin/env bash
set -Eeuo pipefail

psql --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=app_user="$APP_DATABASE_USER" \
  --set=app_password="$APP_DATABASE_PASSWORD" \
  --set=worker_user="$WORKER_DATABASE_USER" \
  --set=worker_password="$WORKER_DATABASE_PASSWORD" <<-'EOSQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS',
  :'app_user',
  :'app_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec

SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS',
  :'worker_user',
  :'worker_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'worker_user') \gexec

SELECT format('GRANT CREATE ON DATABASE %I TO %I', current_database(), :'worker_user') \gexec
EOSQL
