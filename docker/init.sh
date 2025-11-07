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
        
        # Forcefully stop PostgreSQL if it's running
        echo -e "${YELLOW}Ensuring PostgreSQL is stopped...${NC}"
        
        # Try graceful shutdown first
        if sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/main status > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping PostgreSQL gracefully...${NC}"
            sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/main -m fast stop || true
            sleep 3
        fi
        
        # Kill any remaining PostgreSQL processes that might be using the directory
        if pgrep -u postgres postgres > /dev/null 2>&1; then
            echo -e "${YELLOW}Killing remaining PostgreSQL processes...${NC}"
            pkill -9 -u postgres postgres || true
            sleep 2
        fi
        
        # Check for processes using the directory
        if command -v fuser > /dev/null 2>&1; then
            echo -e "${YELLOW}Checking for processes using the data directory...${NC}"
            fuser -k /var/lib/postgresql/16/main 2>/dev/null || true
            sleep 2
        fi
        
        # Backup old data using copy instead of move (more reliable when directory is busy)
        BACKUP_DIR="/var/lib/postgresql/backup-14-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        if [ -d /var/lib/postgresql/16/main ]; then
            echo -e "${YELLOW}Copying old data to backup location...${NC}"
            # Use cp with retry logic
            RETRY_COUNT=0
            MAX_RETRIES=3
            while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
                if cp -r /var/lib/postgresql/16/main "$BACKUP_DIR/main" 2>/dev/null; then
                    echo -e "${GREEN}Old data backed up to: $BACKUP_DIR${NC}"
                    break
                else
                    RETRY_COUNT=$((RETRY_COUNT + 1))
                    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                        echo -e "${YELLOW}Backup attempt $RETRY_COUNT failed, retrying in 2 seconds...${NC}"
                        sleep 2
                    else
                        echo -e "${YELLOW}Could not copy data, will try to rename directory instead...${NC}"
                        # Fallback: rename the directory
                        RENAME_TARGET="/var/lib/postgresql/16/main.old-$(date +%Y%m%d-%H%M%S)"
                        mv /var/lib/postgresql/16/main "$RENAME_TARGET" 2>/dev/null || {
                            echo -e "${RED}Failed to backup or rename PostgreSQL 14 data directory${NC}"
                            echo -e "${YELLOW}Attempting to remove directory anyway (data may be lost)...${NC}"
                        }
                    fi
                fi
            done
            
            # Remove the original directory
            echo -e "${YELLOW}Removing PostgreSQL 14 data directory...${NC}"
            RETRY_COUNT=0
            while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ -d /var/lib/postgresql/16/main ]; do
                if rm -rf /var/lib/postgresql/16/main 2>/dev/null; then
                    break
                else
                    RETRY_COUNT=$((RETRY_COUNT + 1))
                    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                        echo -e "${YELLOW}Removal attempt $RETRY_COUNT failed, retrying in 2 seconds...${NC}"
                        sleep 2
                        # Try killing processes again
                        pkill -9 -u postgres postgres 2>/dev/null || true
                    else
                        echo -e "${RED}Warning: Could not remove PostgreSQL 14 directory. Manual cleanup may be required.${NC}"
                    fi
                fi
            done
        fi
        
        # Ensure parent directory exists for fresh initialization
        mkdir -p /var/lib/postgresql/16
        chown -R postgres:postgres /var/lib/postgresql/16
    fi
fi

# Check for any postgresql.conf files that reference PostgreSQL 14 paths
if [ -d /var/lib/postgresql/16/main ] && [ -f /var/lib/postgresql/16/main/postgresql.conf ]; then
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

# Ensure Redis directory exists and has correct permissions (volume mounts may have wrong ownership)
echo -e "${YELLOW}Ensuring Redis directory permissions...${NC}"
mkdir -p /var/lib/redis
chown -R redis:redis /var/lib/redis
chmod 700 /var/lib/redis

echo -e "${GREEN}Initialization complete. Starting supervisord...${NC}"

# Execute the command passed to the container (supervisord)
exec "$@"

