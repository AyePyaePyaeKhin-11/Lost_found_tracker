#!/usr/bin/env bash
# deploy.sh - get the newest code from GitHub and restart the app.
# Run on the server from the acpapp folder:   bash deploy.sh
set -e
cd "$(dirname "$0")"

echo "==> Pulling the latest code"
git pull

echo "==> Rebuilding and restarting the containers"
docker compose -f docker-compose.prod.yaml up -d --build

echo "==> Removing old unused images"
docker image prune -f

docker compose -f docker-compose.prod.yaml ps
echo "==> Done. Website: http://$(hostname -I | awk '{print $1}'):3000"
