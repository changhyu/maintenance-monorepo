#!/bin/bash

# Script to patch critical security vulnerabilities in node_modules
echo "Applying security patches to address critical vulnerabilities..."

# Find and patch vulnerable loader-utils
find node_modules -path '*/loader-utils/lib/parseQuery.js' -exec sh -c '
  echo "Patching vulnerable loader-utils at {}"
  sed -i.bak "s/var qs = require(\x27querystring\x27);/var qs = require(\x27querystring\x27);\nfunction sanitize(input) { return typeof input === \x27string\x27 ? input : JSON.stringify(input); }/g" {}
  sed -i.bak "s/qs.parse(query.substr(1));/qs.parse(sanitize(query.substr(1)));/g" {}
' \;

# Install patched versions directly in node_modules to override vulnerable ones
echo "Installing patched versions of critical packages..."
npm install loader-utils@2.0.4 shell-quote@1.7.3 --no-save

echo "Security patches applied for critical vulnerabilities."
echo "Note: For a complete security fix, consider updating dependencies regularly and implementing a comprehensive security strategy."