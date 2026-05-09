#!/bin/bash
# ============================================================
# V1RA Dashboard — Rollback Script
# Reverts to the previous version on DigitalOcean
# ============================================================

SERVER="root@157.245.35.83"
RELEASES_DIR="/root/v1ra-deployments/releases"
CURRENT_LINK="/root/v1ra-dashboard"

echo "⏪ Starting Rollback for V1RA Dashboard..."

ssh $SERVER << ENDSSH
  set -e
  cd $RELEASES_DIR

  # Find current active version from symlink
  CURRENT_TARGET=\$(readlink -f $CURRENT_LINK)
  CURRENT_VERSION=\$(basename \$CURRENT_TARGET)

  # Get all versions ordered by time (newest first)
  ALL_VERSIONS=\$(ls -1t)
  
  # Find the next version in the list after the current one
  FOUND=0
  PREVIOUS_VERSION=""
  for v in \$ALL_VERSIONS; do
    if [ \$FOUND -eq 1 ]; then
      PREVIOUS_VERSION=\$v
      break
    fi
    if [ "\$v" == "\$CURRENT_VERSION" ]; then
      FOUND=1
    fi
  done

  # If we were already on the oldest or couldn't find current, fall back to "second most recent"
  if [ -z "\$PREVIOUS_VERSION" ]; then
    echo "⚠️  Could not find a specific 'older' version, falling back to second most recent..."
    PREVIOUS_VERSION=\$(ls -1t | sed -n '2p')
  fi

  if [ -z "\$PREVIOUS_VERSION" ] || [ "\$PREVIOUS_VERSION" == "\$CURRENT_VERSION" ]; then
    echo "❌ Error: No previous version found to rollback to!"
    exit 1
  fi

  PREVIOUS_PATH="$RELEASES_DIR/\$PREVIOUS_VERSION"
  echo "⏪ Rolling back: \$CURRENT_VERSION -> \$PREVIOUS_VERSION"

  # Update symlink
  rm -f $CURRENT_LINK
  ln -s \$PREVIOUS_PATH $CURRENT_LINK

  # Restart PM2 from the new path
  echo "⚙️  Restarting dashboard from \$PREVIOUS_VERSION..."
  cd $CURRENT_LINK
  pm2 stop v1ra-dashboard 2>/dev/null || true
  pm2 delete v1ra-dashboard 2>/dev/null || true
  pm2 start server.js --name "v1ra-dashboard" --env production
  pm2 save

  echo "✅ ROLLBACK COMPLETE! Active version: \$PREVIOUS_VERSION"
ENDSSH
