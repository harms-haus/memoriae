#!/usr/bin/env bash
# Installation script for Memoriae LXC container
# This script runs INSIDE the container after it's created

msg_info "Installing PostgreSQL"
DEBIAN_FRONTEND=noninteractive apt-get install -y wget curl ca-certificates gnupg lsb-release
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
apt update
DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-16 postgresql-contrib-16
systemctl enable postgresql
systemctl start postgresql
msg_ok "Installed PostgreSQL"

msg_info "Waiting for PostgreSQL to be ready"
sleep 3
until sudo -u postgres psql -c 'SELECT 1' > /dev/null 2>&1; do sleep 1; done
msg_ok "PostgreSQL is ready"

msg_info "Configuring PostgreSQL"
sudo -u postgres psql -c "CREATE USER memoriae WITH PASSWORD 'memoriae';" || true
sudo -u postgres psql -c "CREATE DATABASE memoriae OWNER memoriae;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE memoriae TO memoriae;"
msg_ok "Configured PostgreSQL"

msg_info "Installing Redis"
DEBIAN_FRONTEND=noninteractive apt-get install -y redis-server
sed -i 's/bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl start redis-server
msg_ok "Installed Redis"

msg_info "Installing Node.js"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
msg_ok "Installed Node.js"

msg_info "Installing build dependencies"
DEBIAN_FRONTEND=noninteractive apt-get install -y git build-essential python3
msg_ok "Installed build dependencies"

msg_info "Cloning Memoriae repository"
git clone https://github.com/harms-haus/memoriae.git /opt/memoriae
msg_ok "Cloned Memoriae repository"

msg_info "Installing Memoriae dependencies"
cd /opt/memoriae
npm install
msg_ok "Installed Memoriae dependencies"

msg_info "Building Memoriae"
npm run build
msg_ok "Built Memoriae"

msg_info "Configuring environment"
JWT_SECRET=$(openssl rand -base64 32)
cat > /opt/memoriae/.env <<ENVEOF
NODE_ENV=production
PORT=3123
JWT_SECRET=${JWT_SECRET}
DATABASE_URL=postgresql://memoriae:memoriae@localhost:5432/memoriae
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3123
OPENROUTER_API_URL=https://openrouter.ai/api/v1
ENVEOF
msg_ok "Configured environment"

msg_info "Waiting for services to be ready"
until pg_isready -U memoriae -d memoriae > /dev/null 2>&1; do sleep 1; done
until redis-cli ping > /dev/null 2>&1; do sleep 1; done
msg_ok "Services are ready"

msg_info "Running database migrations"
cd /opt/memoriae/backend
npm run migrate
msg_ok "Ran database migrations"

msg_info "Creating systemd service"
cat > /etc/systemd/system/memoriae.service <<'SERVICEEOF'
[Unit]
Description=Memoriae Backend Service
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/memoriae/backend
EnvironmentFile=/opt/memoriae/.env
ExecStart=/usr/bin/node /opt/memoriae/backend/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF
systemctl daemon-reload
systemctl enable memoriae
systemctl start memoriae
msg_ok "Created and started systemd service"

