#!/bin/bash
# ============================================================
# V1RA Dashboard — Auto Deploy Script
# Deploys to DigitalOcean Droplet: 157.245.35.83
# Run this from your LOCAL machine:
#   chmod +x deploy.sh && ./deploy.sh
# ============================================================

SERVER="root@157.245.35.83"
BASE_DIR="/root/v1ra-deployments"
RELEASES_DIR="$BASE_DIR/releases"
CURRENT_LINK="/root/v1ra-dashboard"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASE_PATH="$RELEASES_DIR/$TIMESTAMP"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 V1RA Dashboard Deploy Starting (Versioned)..."
echo "   Server: $SERVER"
echo "   Release: $TIMESTAMP"
echo ""

# 1. Create remote directories and upload
echo "📦 Uploading dashboard files to new release..."
ssh $SERVER "mkdir -p $RELEASE_PATH"
rsync -avz --exclude='node_modules' --exclude='.git' \
  "$LOCAL_DIR/" "$SERVER:$RELEASE_PATH/"
echo "✅ Files uploaded to $RELEASE_PATH"

# 2. Setup and Switch
echo ""
echo "⚙️  Setting up server and switching version..."
ssh $SERVER << ENDSSH
  set -e
  
  # Ensure base directory structure
  mkdir -p $RELEASES_DIR

  cd $RELEASE_PATH

  # 1. Install/Update Environment
  if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  fi
  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
  fi

  # 2. Install dependencies
  npm install --production

  # 3. Environment Config
  cp .env.production .env

  # Update paths in .env (Find scraper data)
  FOUND_CSV=\$(find /root -name "instagram_accounts.csv" 2>/dev/null | head -1)
  if [ -n "\$FOUND_CSV" ]; then
    FOUND_DIR=\$(dirname "\$FOUND_CSV")
    sed -i "s|SCRAPPER_DIR=.*|SCRAPPER_DIR=\$FOUND_DIR|" .env
    sed -i "s|IG_CSV=.*|IG_CSV=\$FOUND_DIR/instagram_accounts.csv|" .env
    sed -i "s|TK_CSV=.*|TK_CSV=\$FOUND_DIR/tiktok_accounts.csv|" .env
    sed -i "s|IG_LOG=.*|IG_LOG=\$FOUND_DIR/logs/instagram-out.log|" .env
    sed -i "s|TK_LOG=.*|TK_LOG=\$FOUND_DIR/logs/tiktok-out.log|" .env
    sed -i "s|OUTREACH_LOG=.*|OUTREACH_LOG=\$FOUND_DIR/outreach_log.json|" .env
    
    # Ensure outreach_log exists
    if [ ! -f "\$FOUND_DIR/outreach_log.json" ]; then
      echo "[]" > "\$FOUND_DIR/outreach_log.json"
    fi
  fi

  # 4. Switch Symlink
  echo "🔗 Updating symlink..."
  if [ -d "$CURRENT_LINK" ] && [ ! -L "$CURRENT_LINK" ]; then
    echo "⚠️  Found existing directory at $CURRENT_LINK. Moving to releases as 'legacy'..."
    mv "$CURRENT_LINK" "$RELEASES_DIR/legacy_$(date +%Y%m%d_%H%M%S)"
  fi
  rm -f $CURRENT_LINK
  ln -s $RELEASE_PATH $CURRENT_LINK

  # 5. Restart Process
  pm2 stop v1ra-dashboard 2>/dev/null || true
  pm2 delete v1ra-dashboard 2>/dev/null || true
  pm2 start server.js --name "v1ra-dashboard" --env production
  pm2 save

  # 6. Cleanup old releases (Keep last 5)
  echo "🧹 Cleaning up old releases..."
  cd $RELEASES_DIR
  ls -1t | tail -n +6 | xargs rm -rf 2>/dev/null || true

  echo "✅ Dashboard is LIVE at version $TIMESTAMP"
ENDSSH

# 3. Firewall
ssh $SERVER "ufw allow 3000/tcp 2>/dev/null || true"

echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "   URL: http://157.245.35.83:3000"
echo "============================================"
