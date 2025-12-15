#!/bin/bash

#
# Copyright (c) 2025 Aarón Negrín
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

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

