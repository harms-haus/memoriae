#!/bin/bash
# Custom PostgreSQL entrypoint that configures pg_hba.conf for network connections
# This wraps the official PostgreSQL entrypoint and ensures pg_hba.conf is configured

# Get the pg_hba.conf location
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
PG_HBA="${PGDATA}/pg_hba.conf"

# Function to configure pg_hba.conf (runs after PostgreSQL starts)
configure_pg_hba() {
  # Wait for pg_hba.conf to exist
  local max_attempts=60
  local attempt=0
  
  while [ ! -f "${PG_HBA}" ] && [ $attempt -lt $max_attempts ]; do
    sleep 1
    attempt=$((attempt + 1))
  done
  
  if [ ! -f "${PG_HBA}" ]; then
    echo "Warning: pg_hba.conf not found at ${PG_HBA}"
    return 1
  fi

  # Check if network entry already exists
  if ! grep -q "^host.*all.*all.*0.0.0.0/0" "${PG_HBA}"; then
    echo "Configuring pg_hba.conf to allow network connections..."
    
    # Backup original if not already backed up
    if [ ! -f "${PG_HBA}.bak" ]; then
      cp "${PG_HBA}" "${PG_HBA}.bak"
    fi
    
    # Add entry to allow connections from any IP (Docker/Podman networks)
    # Using scram-sha-256 for secure password authentication
    echo "host    all             all             0.0.0.0/0               scram-sha-256" >> "${PG_HBA}"
    
    # Also allow IPv6
    if ! grep -q "^host.*all.*all.*::/0" "${PG_HBA}"; then
      echo "host    all             all             ::/0                    scram-sha-256" >> "${PG_HBA}"
    fi
    
    echo "pg_hba.conf configured successfully"
    
    # Reload PostgreSQL configuration if it's running
    sleep 2
    if command -v psql > /dev/null 2>&1; then
      psql -U "${POSTGRES_USER:-postgres}" -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1 || true
    fi
  else
    echo "pg_hba.conf already configured for network connections"
  fi
  
  return 0
}

# Call the original PostgreSQL entrypoint and configure pg_hba.conf in background
if [ "$1" = 'postgres' ]; then
  # Start configuration in background after a delay
  (sleep 10 && configure_pg_hba) &
fi

# Execute the original entrypoint
exec /usr/local/bin/docker-entrypoint.sh "$@"

