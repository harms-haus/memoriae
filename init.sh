#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Memoriae container initialization...${NC}"

# Check if volume contains PostgreSQL 14 data (from previous version)
if [ -f /var/lib/postgresql/16/main/PG_VERSION ]; then
    PG_VERSION=$(cat /var/lib/postgresql/16/main/PG_VERSION 2>/dev/null || echo "")
    if [ "$PG_VERSION" = "14" ]; then
        echo -e "${YELLOW}WARNING: Volume contains PostgreSQL 14 data, but we're using PostgreSQL 16${NC}"
        echo -e "${YELLOW}PostgreSQL 16 cannot use PostgreSQL 14 data directly.${NC}"
        echo -e "${YELLOW}Backing up old data and initializing fresh PostgreSQL 16 database...${NC}"
        
        # Backup old data
        BACKUP_DIR="/var/lib/postgresql/backup-14-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        mv /var/lib/postgresql/16/main "$BACKUP_DIR/main" 2>/dev/null || true
        echo -e "${GREEN}Old data backed up to: $BACKUP_DIR${NC}"
    fi
fi

# Check for any postgresql.conf files that reference PostgreSQL 14 paths
if [ -f /var/lib/postgresql/16/main/postgresql.conf ]; then
    if grep -q "/var/lib/postgresql/14" /var/lib/postgresql/16/main/postgresql.conf; then
        echo -e "${YELLOW}Found PostgreSQL 14 path references in config, fixing...${NC}"
        sudo -u postgres sed -i 's|/var/lib/postgresql/14|/var/lib/postgresql/16|g' /var/lib/postgresql/16/main/postgresql.conf
    fi
fi

# Initialize PostgreSQL if data directory is empty or doesn't exist
if [ ! -f /var/lib/postgresql/16/main/PG_VERSION ]; then
    echo -e "${YELLOW}Initializing PostgreSQL database...${NC}"
    
    # Ensure the directory exists and has correct permissions
    mkdir -p /var/lib/postgresql/16/main
    chown -R postgres:postgres /var/lib/postgresql/16/main
    chmod 700 /var/lib/postgresql/16/main
    
    # Initialize the database
    sudo -u postgres /usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/16/main
    
    # Configure PostgreSQL to listen on localhost (for container internal use)
    # Config files are created by initdb in the data directory
    if [ -f /var/lib/postgresql/16/main/postgresql.conf ]; then
        sudo -u postgres sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /var/lib/postgresql/16/main/postgresql.conf
    fi
    
    # Configure authentication - allow local connections with md5
    if [ -f /var/lib/postgresql/16/main/pg_hba.conf ]; then
        sudo -u postgres bash -c "echo 'host    all             all             127.0.0.1/32            md5' >> /var/lib/postgresql/16/main/pg_hba.conf"
        sudo -u postgres bash -c "echo 'host    all             all             ::1/128                 md5' >> /var/lib/postgresql/16/main/pg_hba.conf"
    fi
else
    echo -e "${GREEN}PostgreSQL data directory already exists, skipping initialization${NC}"
    
    # Always ensure correct permissions (volume mounts may have wrong ownership)
    echo -e "${YELLOW}Ensuring PostgreSQL directory permissions...${NC}"
    chown -R postgres:postgres /var/lib/postgresql/16/main
    chmod 700 /var/lib/postgresql/16/main
    
    # Ensure config files exist (they might be missing if volume was partially initialized)
    if [ ! -f /var/lib/postgresql/16/main/postgresql.conf ]; then
        echo -e "${YELLOW}PostgreSQL config file missing, creating minimal configuration...${NC}"
        # Ensure directory permissions
        chown -R postgres:postgres /var/lib/postgresql/16/main
        chmod 700 /var/lib/postgresql/16/main
        
        # Create minimal postgresql.conf
        sudo -u postgres bash -c "cat > /var/lib/postgresql/16/main/postgresql.conf << 'EOF'
listen_addresses = 'localhost'
port = 5432
data_directory = '/var/lib/postgresql/16/main'
EOF"
        
        # Create minimal pg_hba.conf if missing
        if [ ! -f /var/lib/postgresql/16/main/pg_hba.conf ]; then
            sudo -u postgres bash -c "cat > /var/lib/postgresql/16/main/pg_hba.conf << 'EOF'
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF"
        else
            # Ensure authentication entries exist
            if ! grep -q "127.0.0.1/32" /var/lib/postgresql/16/main/pg_hba.conf; then
                sudo -u postgres bash -c "echo 'host    all             all             127.0.0.1/32            md5' >> /var/lib/postgresql/16/main/pg_hba.conf"
            fi
            if ! grep -q "::1/128" /var/lib/postgresql/16/main/pg_hba.conf; then
                sudo -u postgres bash -c "echo 'host    all             all             ::1/128                 md5' >> /var/lib/postgresql/16/main/pg_hba.conf"
            fi
        fi
    fi
fi

# Start PostgreSQL temporarily to set up database
echo -e "${YELLOW}Starting PostgreSQL for initialization...${NC}"

# Ensure permissions are correct before starting (in case volume was mounted with wrong ownership)
chown -R postgres:postgres /var/lib/postgresql/16/main
chmod 700 /var/lib/postgresql/16/main

# Check if PostgreSQL config file exists (should exist now after fallback creation above)
if [ ! -f /var/lib/postgresql/16/main/postgresql.conf ]; then
    echo -e "${RED}PostgreSQL configuration file not found. Initialization may have failed.${NC}"
    exit 1
fi

# Check if PostgreSQL is already running
if sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/main status > /dev/null 2>&1; then
    echo -e "${GREEN}PostgreSQL is already running${NC}"
else
    # Start PostgreSQL
    sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/main -w start || {
        echo -e "${RED}Failed to start PostgreSQL. Checking logs...${NC}"
        sudo -u postgres tail -n 50 /var/lib/postgresql/16/main/log/*.log 2>/dev/null || true
        exit 1
    }
fi

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if sudo -u postgres psql -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}PostgreSQL failed to start after 30 attempts${NC}"
        exit 1
    fi
    sleep 1
done

# Create database and user if they don't exist
echo -e "${YELLOW}Setting up database and user...${NC}"
sudo -u postgres psql -c "CREATE USER memoriae WITH PASSWORD 'memoriae';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "ALTER USER memoriae WITH PASSWORD 'memoriae';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE memoriae OWNER memoriae;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE memoriae TO memoriae;" 2>/dev/null || true

# Stop PostgreSQL (supervisord will start it)
echo -e "${YELLOW}Stopping PostgreSQL (supervisord will manage it)...${NC}"
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/main -m fast stop || true

# Wait a moment for PostgreSQL to fully stop
sleep 2

echo -e "${GREEN}Initialization complete. Starting supervisord...${NC}"

# Execute the command passed to the container (supervisord)
exec "$@"

