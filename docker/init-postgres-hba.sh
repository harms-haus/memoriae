#!/bin/bash
# Initialize PostgreSQL pg_hba.conf to allow connections from Docker/Podman networks
# This script runs automatically on first database initialization via docker-entrypoint-initdb.d

set -e

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
PG_HBA="${PGDATA}/pg_hba.conf"

echo "Configuring pg_hba.conf for network connections..."

# Add entries to allow connections from any IP (Docker/Podman networks)
# Using scram-sha-256 for secure password authentication
echo "host    all             all             0.0.0.0/0               scram-sha-256" >> "${PG_HBA}"
echo "host    all             all             ::/0                    scram-sha-256" >> "${PG_HBA}"

echo "pg_hba.conf configured for network connections"
