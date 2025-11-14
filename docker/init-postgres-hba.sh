#!/bin/bash
# Initialize PostgreSQL pg_hba.conf to allow connections from Docker/Podman networks
# This script runs after PostgreSQL starts to configure authentication

set -e

# Wait for PostgreSQL to be ready
until pg_isready -U "${POSTGRES_USER:-memoriae}" > /dev/null 2>&1; do
  sleep 1
done

# Get the pg_hba.conf location
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
PG_HBA="${PGDATA}/pg_hba.conf"

# Backup original pg_hba.conf
if [ ! -f "${PG_HBA}.bak" ]; then
  cp "${PG_HBA}" "${PG_HBA}.bak"
fi

# Check if network entry already exists
if ! grep -q "host.*all.*all.*0.0.0.0/0" "${PG_HBA}"; then
  echo "Configuring pg_hba.conf to allow network connections..."
  
  # Add entry to allow connections from any IP (Docker/Podman networks)
  # Using scram-sha-256 for secure password authentication
  echo "host    all             all             0.0.0.0/0               scram-sha-256" >> "${PG_HBA}"
  
  # Also allow IPv6
  echo "host    all             all             ::/0                    scram-sha-256" >> "${PG_HBA}"
  
  echo "pg_hba.conf configured successfully"
  
  # Reload PostgreSQL configuration
  psql -U "${POSTGRES_USER:-memoriae}" -c "SELECT pg_reload_conf();" > /dev/null 2>&1 || true
else
  echo "pg_hba.conf already configured for network connections"
fi

