#!/usr/bin/env bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE USER express ENCRYPTED PASSWORD 'bun+typescript';
  CREATE DATABASE forum_board OWNER express;
  GRANT ALL ON DATABASE forum_board TO express;
  CREATE DATABASE forum_board_s OWNER express;
  GRANT ALL ON DATABASE forum_board_s TO express;
EOSQLbun+typescript