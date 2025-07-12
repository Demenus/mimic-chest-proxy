#!/bin/bash

# Simple script to launch Chrome with the test proxy server

PROXY_PORT=${PROXY_PORT:-8888}
PROXY_URL="http://localhost:${PROXY_PORT}"

echo "Launching Chrome with proxy: ${PROXY_URL}"
echo "Make sure the proxy server is running first!"
echo ""

# Find Chrome executable
if command -v google-chrome &> /dev/null; then
    CHROME_CMD="google-chrome"
elif command -v google-chrome-stable &> /dev/null; then
    CHROME_CMD="google-chrome-stable"
elif command -v chromium &> /dev/null; then
    CHROME_CMD="chromium"
elif command -v chromium-browser &> /dev/null; then
    CHROME_CMD="chromium-browser"
else
    echo "Error: Chrome/Chromium not found!"
    exit 1
fi

echo "Using Chrome: ${CHROME_CMD}"
echo ""

# Launch Chrome with proxy
"${CHROME_CMD}" \
  --proxy-server="${PROXY_URL}" \
  --disable-web-security \
  --disable-features=IsolateOrigins,site-per-process \
  --user-data-dir=/tmp/chrome-test-proxy \
  "http://httpforever.com/"

