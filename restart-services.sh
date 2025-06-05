#!/bin/bash
# This script restarts the backend service and reloads the Caddy configuration in a 
# production environment using Docker Compose.

set -e


# Sync content directory to the production server.
echo "🔄 Syncing content directory to production server..."


# Restart just the backend service.
echo "🚀 Restarting backend..."
docker --context prod-texttailor compose restart backend

# Reload Caddy configuration to apply any changes.
echo "⚙️ Reloading Caddy config..."
CADDY_CONTAINER=$(docker --context prod-texttailor ps | grep caddy | awk '{print $1;}')
docker --context prod-texttailor exec -w /etc/caddy "$CADDY_CONTAINER" caddy reload

# That's it! The frontend doesn't need a restart.
echo "✅ Deploy complete."