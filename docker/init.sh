#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Memoriae container initialization...${NC}"

# Initialize PostgreSQL if data directory is empty or doesn't exist
if [ ! -f /var/lib/postgresql/14/main/PG_VERSION ]; then
    echo -e "${YELLOW}Initializing PostgreSQL database...${NC}"
    
    # Ensure the directory exists and has correct permissions
    mkdir -p /var/lib/postgresql/14/main
    chown -R postgres:postgres /var/lib/postgresql/14/main
    chmod 700 /var/lib/postgresql/14/main
    
    # Initialize the database
    sudo -u postgres /usr/lib/postgresql/14/bin/initdb -D /var/lib/postgresql/14/main
    
    # Configure PostgreSQL to listen on localhost (for container internal use)
    # Config files are created by initdb in the data directory
    if [ -f /var/lib/postgresql/14/main/postgresql.conf ]; then
        sudo -u postgres sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /var/lib/postgresql/14/main/postgresql.conf
    fi
    
    # Configure authentication - allow local connections with md5
    if [ -f /var/lib/postgresql/14/main/pg_hba.conf ]; then
        sudo -u postgres bash -c "echo 'host    all             all             127.0.0.1/32            md5' >> /var/lib/postgresql/14/main/pg_hba.conf"
        sudo -u postgres bash -c "echo 'host    all             all             ::1/128                 md5' >> /var/lib/postgresql/14/main/pg_hba.conf"
    fi
else
    echo -e "${GREEN}PostgreSQL data directory already exists, skipping initialization${NC}"
    
    # Ensure config files exist (they might be missing if volume was partially initialized)
    if [ ! -f /var/lib/postgresql/14/main/postgresql.conf ]; then
        echo -e "${YELLOW}PostgreSQL config file missing, creating minimal configuration...${NC}"
        # Ensure directory permissions
        chown -R postgres:postgres /var/lib/postgresql/14/main
        chmod 700 /var/lib/postgresql/14/main
        
        # Create minimal postgresql.conf
        sudo -u postgres bash -c "cat > /var/lib/postgresql/14/main/postgresql.conf << 'EOF'
listen_addresses = 'localhost'
port = 5432
data_directory = '/var/lib/postgresql/14/main'
EOF"
        
        # Create minimal pg_hba.conf if missing
        if [ ! -f /var/lib/postgresql/14/main/pg_hba.conf ]; then
            sudo -u postgres bash -c "cat > /var/lib/postgresql/14/main/pg_hba.conf << 'EOF'
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF"
        else
            # Ensure authentication entries exist
            if ! grep -q "127.0.0.1/32" /var/lib/postgresql/14/main/pg_hba.conf; then
                sudo -u postgres bash -c "echo 'host    all             all             127.0.0.1/32            md5' >> /var/lib/postgresql/14/main/pg_hba.conf"
            fi
            if ! grep -q "::1/128" /var/lib/postgresql/14/main/pg_hba.conf; then
                sudo -u postgres bash -c "echo 'host    all             all             ::1/128                 md5' >> /var/lib/postgresql/14/main/pg_hba.conf"
            fi
        fi
    fi
fi

# Start PostgreSQL temporarily to set up database
echo -e "${YELLOW}Starting PostgreSQL for initialization...${NC}"
# PostgreSQL should work even without explicit config file (uses defaults)
# But we'll check if it starts successfully
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl -D /var/lib/postgresql/14/main -w start || {
    echo -e "${YELLOW}PostgreSQL may already be running or failed to start. Continuing...${NC}"
}

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
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl -D /var/lib/postgresql/14/main -m fast stop || true

# Wait a moment for PostgreSQL to fully stop
sleep 2

echo -e "${GREEN}Initialization complete. Starting supervisord...${NC}"

# Execute the command passed to the container (supervisord)
exec "$@"

