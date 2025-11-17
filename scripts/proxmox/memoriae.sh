#!/usr/bin/env bash
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)
# Copyright (c) 2021-2025 tteck
# Author: tteck (tteckster)
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/harms-haus/memoriae

APP="Memoriae"
var_tags="${var_tags:-memoriae;memory;notes}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-2048}"
var_disk="${var_disk:-8}"
var_os="${var_os:-debian}"
var_version="${var_version:-13}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

function update_script() {
    header_info
    check_container_storage
    check_container_resources
    if [[ ! -d /opt/memoriae ]]; then
        msg_error "No ${APP} Installation Found!"
        exit
    fi
    msg_info "Updating ${APP} LXC"
    $STD apt update
    $STD apt -y upgrade
    msg_ok "Updated successfully!"
    exit
}

start
build_container
description

msg_info "Installing PostgreSQL"
$STD bash -c "DEBIAN_FRONTEND=noninteractive apt-get install -y wget curl ca-certificates gnupg lsb-release"
$STD bash -c "curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg"
$STD bash -c "echo \"deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt \$(lsb_release -cs)-pgdg main\" > /etc/apt/sources.list.d/pgdg.list"
$STD apt update
$STD bash -c "DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-16 postgresql-contrib-16"
$STD systemctl enable postgresql
$STD systemctl start postgresql
msg_ok "Installed PostgreSQL"

msg_info "Waiting for PostgreSQL to be ready"
sleep 3
$STD bash -c "until sudo -u postgres psql -c 'SELECT 1' > /dev/null 2>&1; do sleep 1; done"
msg_ok "PostgreSQL is ready"

msg_info "Configuring PostgreSQL"
$STD bash -c "sudo -u postgres psql -c \"CREATE USER memoriae WITH PASSWORD 'memoriae';\" || true"
$STD bash -c "sudo -u postgres psql -c \"CREATE DATABASE memoriae OWNER memoriae;\" || true"
$STD bash -c "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE memoriae TO memoriae;\""
msg_ok "Configured PostgreSQL"

msg_info "Installing Redis"
$STD bash -c "DEBIAN_FRONTEND=noninteractive apt-get install -y redis-server"
$STD bash -c "sed -i 's/bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf"
$STD systemctl enable redis-server
$STD systemctl start redis-server
msg_ok "Installed Redis"

msg_info "Installing Node.js"
$STD bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
$STD bash -c "DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs"
msg_ok "Installed Node.js"

msg_info "Installing build dependencies"
$STD bash -c "DEBIAN_FRONTEND=noninteractive apt-get install -y git build-essential python3"
msg_ok "Installed build dependencies"

msg_info "Cloning Memoriae repository"
$STD git clone https://github.com/harms-haus/memoriae.git /opt/memoriae
msg_ok "Cloned Memoriae repository"

msg_info "Installing Memoriae dependencies"
$STD bash -c "cd /opt/memoriae && npm install"
msg_ok "Installed Memoriae dependencies"

msg_info "Building Memoriae"
$STD bash -c "cd /opt/memoriae && npm run build"
msg_ok "Built Memoriae"

msg_info "Configuring environment"
$STD bash -c "JWT_SECRET=\$(openssl rand -base64 32)
cat > /opt/memoriae/.env <<ENVEOF
NODE_ENV=production
PORT=3123
JWT_SECRET=\${JWT_SECRET}
DATABASE_URL=postgresql://memoriae:memoriae@localhost:5432/memoriae
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3123
OPENROUTER_API_URL=https://openrouter.ai/api/v1
ENVEOF
"
msg_ok "Configured environment"

msg_info "Waiting for services to be ready"
$STD bash -c "until pg_isready -U memoriae -d memoriae > /dev/null 2>&1; do sleep 1; done"
$STD bash -c "until redis-cli ping > /dev/null 2>&1; do sleep 1; done"
msg_ok "Services are ready"

msg_info "Running database migrations"
$STD bash -c "cd /opt/memoriae/backend && npm run migrate"
msg_ok "Ran database migrations"

msg_info "Creating systemd service"
$STD bash -c "cat > /etc/systemd/system/memoriae.service <<'SERVICEEOF'
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
"
$STD systemctl daemon-reload
$STD systemctl enable memoriae
$STD systemctl start memoriae
msg_ok "Created and started systemd service"

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW} Access it using the following IP:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}${IP}:3123${CL}"
echo -e "${INFO}${YW} PostgreSQL is running on:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}${IP}:5432${CL}"
echo -e "${INFO}${YW} Redis is running on:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}${IP}:6379${CL}"
echo -e "${INFO}${YW} To configure OAuth and OpenRouter, edit:${CL}"
echo -e "${TAB}${BGN}/opt/memoriae/.env${CL}"

