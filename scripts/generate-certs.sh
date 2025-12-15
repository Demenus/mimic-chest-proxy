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

# Generate self-signed SSL certificates for testing
# Certificates will be generated in the certs/ directory at the project root

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CERT_DIR="$PROJECT_ROOT/certs"
CA_DIR="$CERT_DIR/ca"

mkdir -p "$CERT_DIR"
mkdir -p "$CA_DIR"

echo "Generating self-signed SSL certificates..."
echo "Certificates will be generated in: $CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/key.pem" 2048

# Generate certificate signing request
openssl req -new -key "$CERT_DIR/key.pem" -out "$CERT_DIR/csr.pem" -subj "/C=US/ST=State/L=City/O=Test/CN=localhost"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -days 365 -in "$CERT_DIR/csr.pem" -signkey "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem"

# Clean up CSR
rm "$CERT_DIR/csr.pem"

echo ""
echo "Certificates generated in $CERT_DIR/"
echo "  - key.pem (private key)"
echo "  - cert.pem (certificate)"
echo ""
echo "CA directory for http-mitm-proxy: $CA_DIR"
echo "  (http-mitm-proxy will generate CA certificates here automatically)"


