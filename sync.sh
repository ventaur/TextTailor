#!/bin/bash
# This script syncs the local TextTailor project to a remote server for deployment.

REMOTE_ALIAS=text-tailor
REMOTE_PATH=/home/matt/dev/TextTailor


echo "🔄 Syncing local project to remote server..."
rsync -avz --delete ./frontend/dist/ "$REMOTE_ALIAS:$REMOTE_PATH/frontend/dist/"
rsync -avz --delete --exclude logs ./backend/ "$REMOTE_ALIAS:$REMOTE_PATH/backend/"
rsync -avz ./caddy/Caddyfile "$REMOTE_ALIAS:$REMOTE_PATH/caddy/Caddyfile"

echo "✅ Sync complete. Ready for remote deployment."
