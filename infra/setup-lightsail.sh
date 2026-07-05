#!/bin/bash
# One-time Lightsail setup — run as ubuntu on a fresh Lightsail Ubuntu 22.04 instance.
# Recommended plan: $10/mo (2 GB RAM, 1 vCPU, 60 GB SSD)
set -e

echo "=== 1. System packages ==="
sudo apt-get update -y
sudo apt-get install -y git nginx postgresql postgresql-contrib

echo "=== 2. Node.js 20 (via nvm) ==="
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20
sudo ln -sf "$(which node)" /usr/local/bin/node
sudo ln -sf "$(which npm)"  /usr/local/bin/npm
sudo ln -sf "$(which npx)"  /usr/local/bin/npx

echo "=== 3. PM2 ==="
npm install -g pm2
sudo ln -sf "$(which pm2)" /usr/local/bin/pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash

echo "=== 4. PostgreSQL: create database and user ==="
sudo systemctl enable postgresql
sudo systemctl start postgresql
# Change CHANGE_THIS_PASSWORD before running, or update it after
sudo -u postgres psql <<SQL
CREATE USER weebrook WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE weebrook OWNER weebrook;
GRANT ALL PRIVILEGES ON DATABASE weebrook TO weebrook;
SQL

echo "=== 5. Clone repo ==="
# Replace with your actual GitHub repo URL
git clone https://github.com/jhodges/weebrook.git /home/ubuntu/weebrook
cd /home/ubuntu/weebrook

echo "=== 6. Log directory ==="
mkdir -p /home/ubuntu/logs

echo "=== 7. nginx ==="
sudo cp /home/ubuntu/weebrook/infra/nginx.conf /etc/nginx/sites-available/weebrook
sudo ln -sf /etc/nginx/sites-available/weebrook /etc/nginx/sites-enabled/weebrook
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl start nginx

echo ""
echo "=== NEXT STEPS (manual) ==="
echo "1. Create /home/ubuntu/weebrook/backend/.env (copy .env.production.example)"
echo "   Set: DATABASE_URL=postgresql://weebrook:CHANGE_THIS_PASSWORD@localhost:5432/weebrook"
echo "2. cd /home/ubuntu/weebrook && npm ci"
echo "3. npm run build --workspace=backend"
echo "4. npm run migrate:deploy --workspace=backend"
echo "5. pm2 start /home/ubuntu/weebrook/infra/pm2.ecosystem.config.cjs"
echo "6. pm2 save"
echo ""
echo "=== LIGHTSAIL CONSOLE (do these in the AWS console) ==="
echo "Networking tab → Firewall → Add rule: HTTP port 80, all sources"
echo "Networking tab → Create static IP → Attach to this instance"
echo "Use that static IP as your CloudFront custom origin."
