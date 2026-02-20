#!/bin/bash
# Clear PicoClaw session history to free up AI context memory
# This is particularly useful for lower-powered hardware like Raspberry Pi 1 B+

SESSION_DIR="/home/pi/.picoclaw/workspace/sessions"

if [ -d "$SESSION_DIR" ]; then
    echo "Clearing PicoClaw conversation history..."
    rm -rf "$SESSION_DIR"/*
    echo "Done! PicoClaw context is now fresh."
else
    echo "Error: Session directory not found at $SESSION_DIR"
    exit 1
fi
