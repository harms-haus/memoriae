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
# Override the install script URL to point to our repo
var_install_url="https://raw.githubusercontent.com/harms-haus/memoriae/main/scripts/proxmox/memoriae-install.sh"

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
    msg_info "Updating ${APP} LXC packages"
    $STD apt update
    $STD apt -y upgrade
    msg_ok "Updated container packages"
    
    msg_info "Updating ${APP} application"
    cd /opt/memoriae
    msg_info "Pulling latest changes from repository"
    $STD git pull
    msg_ok "Pulled latest changes"
    
    msg_info "Installing/updating dependencies"
    $STD npm install
    msg_ok "Updated dependencies"
    
    msg_info "Building ${APP}"
    $STD npm run build
    msg_ok "Built ${APP}"
    
    msg_info "Running database migrations"
    cd /opt/memoriae/backend
    # Load environment variables
    set -a
    source /opt/memoriae/.env
    set +a
    $STD NODE_ENV=production npm run migrate
    msg_ok "Ran database migrations"
    
    msg_info "Restarting ${APP} service"
    $STD systemctl daemon-reload
    $STD systemctl restart memoriae
    msg_ok "Restarted ${APP} service"
    
    msg_ok "Updated ${APP} successfully!"
    exit
}

start
# build_container will create the container but fail when trying to fetch install script
# We'll catch that and run our install script manually
set +e
build_container
BUILD_EXIT=$?
set -e

# If build_container failed (likely due to 404 on install script), but container was created, run our install
if [[ $BUILD_EXIT -ne 0 ]] && [[ -n "${CTID:-}" ]] && pct status "$CTID" &>/dev/null; then
    msg_info "Container created, running our installation script..."
    lxc-attach -n "$CTID" -- bash -c "$(curl -fsSL https://raw.githubusercontent.com/harms-haus/memoriae/main/scripts/proxmox/memoriae-install.sh)"
elif [[ $BUILD_EXIT -eq 0 ]]; then
    # build_container succeeded (unlikely but possible)
    msg_ok "Container built and installed successfully"
else
    msg_error "Failed to create container"
    exit 1
fi

description

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

