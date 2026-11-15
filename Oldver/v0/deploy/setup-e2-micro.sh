#!/bin/bash
# Setup script for Google Cloud e2-micro VM (Debian/Ubuntu)
# Includes MariaDB + Node + nginx + Let's Encrypt HTTPS
# Usage: sudo DOMAIN=your.domain.com bash deploy/setup-e2-micro.sh
set -e

DOMAIN="${DOMAIN:-}"
if [ -z "$DOMAIN" ]; then
  echo "ERROR: Set DOMAIN environment variable, e.g."
  echo "  sudo DOMAIN=dwss.example.com bash deploy/setup-e2-micro.sh"
  exit 1
fi

echo "=== DWSS Cloud Setup (e2-micro + MariaDB + HTTPS) ==="
echo "Domain: $DOMAIN"

# ---------- Stop anything that would block ports 80/443/8080 ----------
echo "Stopping conflicting services..."
systemctl stop caddy 2>/dev/null || true
systemctl disable caddy 2>/dev/null || true
systemctl stop dwss 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true

# Kill leftover listeners (old node on 4000/8080, stray caddy)
for port in 80 443 4000 8080; do
  pids=$(ss -tlnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print}' | grep -oP 'pid=\K[0-9]+' | sort -u)
  for pid in $pids; do
    kill -9 "$pid" 2>/dev/null || true
  done
done
pkill -f "node server.js" 2>/dev/null || true
pkill -x caddy 2>/dev/null || true
sleep 1
echo "Ports cleared."

# Update
apt-get update -y
apt-get install -y curl gnupg

# Node.js 20
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# MariaDB
apt-get install -y mariadb-server
systemctl enable --now mariadb

# Lower memory use for e2-micro (1 GB RAM)
if [ -d /etc/mysql/mariadb.conf.d ]; then
  cat > /etc/mysql/mariadb.conf.d/99-e2micro.cnf << 'EOF'
[mysqld]
innodb_buffer_pool_size = 64M
performance_schema = OFF
EOF
  systemctl restart mariadb || true
fi

# nginx + certbot + rsync
apt-get install -y nginx certbot python3-certbot-nginx rsync
systemctl enable --now nginx

# DB user
mysql -e "CREATE DATABASE IF NOT EXISTS dwss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'dwss'@'localhost' IDENTIFIED BY 'dwss_cloud_pass';"
mysql -e "GRANT ALL PRIVILEGES ON dwss.* TO 'dwss'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# App directory — if you run this script from inside the project folder,
# it will copy the files to /opt/dwss for you.
APP_DIR=/opt/dwss
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

mkdir -p "$APP_DIR"

# If we are not already running from APP_DIR, copy the project there
if [ "$PROJECT_DIR" != "$APP_DIR" ]; then
  echo "Copying project from $PROJECT_DIR to $APP_DIR ..."
  rsync -a --exclude node_modules "$PROJECT_DIR/" "$APP_DIR/"
fi

cd "$APP_DIR"
if [ -f package.json ]; then
  npm install --production
fi

# Make sure the service user can read the files
chown -R www-data:www-data "$APP_DIR" || true
chmod -R a+rX "$APP_DIR" || true

# Environment
cat > /etc/dwss.env << EOF
PORT=8080
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=dwss
DB_PASSWORD=dwss_cloud_pass
DB_NAME=dwss
EOF
chmod 600 /etc/dwss.env

# systemd service for Node
cat > /etc/systemd/system/dwss.service << EOF
[Unit]
Description=AEL DWSS
After=network.target mariadb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
EnvironmentFile=/etc/dwss.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now dwss

# nginx config (full HTTPS template kept for reference; not enabled until certs exist)
NGINX_CONF=/etc/nginx/sites-available/dwss
cp "$APP_DIR/deploy/nginx-dwss.conf" "$NGINX_CONF"
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" "$NGINX_CONF"
rm -f /etc/nginx/sites-enabled/default

# Temporary HTTP-only config so certbot can validate
mkdir -p /var/www/html
cat > /etc/nginx/sites-available/dwss-http << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { proxy_pass http://127.0.0.1:8080; }
}
EOF
ln -sf /etc/nginx/sites-available/dwss-http /etc/nginx/sites-enabled/dwss
nginx -t && systemctl reload nginx

# Obtain certificate and let certbot configure HTTPS
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" --redirect; then
  echo "Certificate obtained and HTTPS configured by certbot."
  nginx -t && systemctl reload nginx
else
  echo "Certbot failed. Check that DNS for $DOMAIN points to this VM and port 80 is open."
  echo "You can re-run later: certbot --nginx -d $DOMAIN"
  echo "Continuing with HTTP only for now."
fi

echo "=== Done ==="
systemctl restart dwss || true
systemctl status dwss --no-pager || true
echo "HTTPS should be available at https://$DOMAIN"
echo "Open firewall ports 80 and 443 if not already open."
echo "Change the DB password in /etc/dwss.env after first login."
