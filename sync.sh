#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Configuration
PASS="${password}"
REMOTE_USER="${username:-pi}"
REMOTE_HOST="${hostname:-mypaclaw.local}"
REMOTE_DIR="~/picoclaw/"

# Exclude list
EXCLUDE=(
    "--exclude=.git/"
    "--exclude=.agent/"
    "--exclude=.agents/"
    "--exclude=node_modules/"
    "--exclude=tmp/"
    "--exclude=*.exe"
    "--exclude=sync.sh"
    "--exclude=build/picoclaw-darwin-*"
    "--exclude=build/picoclaw-linux-amd64"
    "--exclude=build/picoclaw-linux-arm64"
    "--exclude=note.txt"
)

# Run rsync
sshpass -p "$PASS" rsync -avz "${EXCLUDE[@]}" ./ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

echo "Sync completed at $(date)"
