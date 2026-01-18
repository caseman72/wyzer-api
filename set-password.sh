#!/bin/bash

# Prompt for password (hidden)
echo -n "Enter Wyze password: "
read -s PASSWORD
echo ""

# Triple MD5 hash
HASH1=$(echo -n "$PASSWORD" | md5)
HASH2=$(echo -n "$HASH1" | md5)
HASH3=$(echo -n "$HASH2" | md5)

echo "Password hashed: ${HASH3:0:8}..."

# Update .env.local
if [[ -f .env.local ]]; then
  # Remove existing password line and add hashed one
  grep -v "^WYZE_PASSWORD=" .env.local > .env.local.tmp
  echo "WYZE_PASSWORD_HASH=$HASH3" >> .env.local.tmp
  mv .env.local.tmp .env.local
  echo "Updated .env.local with hashed password"
else
  echo "WYZE_PASSWORD_HASH=$HASH3" > .env.local
  echo "Created .env.local with hashed password"
fi
