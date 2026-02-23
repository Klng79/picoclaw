#!/bin/bash

# Ensure sync.sh is executable
chmod +x ./sync.sh

echo "Starting auto-sync... I'll watch for file changes in $(pwd)"
echo "Changes will be synced to Raspberry Pi automatically."
echo "Press Ctrl+C to stop."

# Exclude list for paths to watch (optional, fswatch will see all but sync.sh ignores them anyway)
# We watch current directory (.) and fire sync.sh on any change event
fswatch -o . -e ".*" -e "note.txt" -i "\\.go$" -i "\\.md$" -i "\\.json$" -i "\\.txt$" -i "\\.yml$" -i "\\.yaml$" | while read f; do
    ./sync.sh
done
