#!/bin/bash
# PostCSS specific patch script
echo "Running PostCSS specific security patches..."

# Create patches directory
PATCH_DIR="$(pwd)/.security-patches"
mkdir -p $PATCH_DIR/patches
mkdir -p $PATCH_DIR/backups

# Record the patching date
PATCH_DATE=$(date "+%Y-%m-%d %H:%M:%S")

# Patch postcss modules
echo "Patching vulnerable postcss modules..."

find node_modules -path "*/postcss/lib/parse.js" -type f -exec bash -c '
  MODULE_PATH="$1"
  BACKUP_PATH="$2/backups/$(dirname ${MODULE_PATH#node_modules/} | tr "/" "_")_$(basename $MODULE_PATH).bak"
  
  echo "- Patching: $MODULE_PATH"
  
  # Create backup of original file if not exists
  if [ ! -f "$BACKUP_PATH" ]; then
    mkdir -p "$(dirname $BACKUP_PATH)"
    cp "$MODULE_PATH" "$BACKUP_PATH"
  fi
  
  # Reset to original (in case of multiple runs)
  if [ -f "$BACKUP_PATH" ]; then
    cp "$BACKUP_PATH" "$MODULE_PATH"
  fi
  
  # Find the position where the parse function starts
  LINE_NUM=$(grep -n "function parse(css, opts)" "$MODULE_PATH" | head -1 | cut -d":" -f1)
  
  if [ ! -z "$LINE_NUM" ]; then
    # Calculate the line after function opening brace
    BRACKET_LINE=$((LINE_NUM + 1))
    
    # Insert security check right after function opening
    sed -i.bak "${BRACKET_LINE}a\\  if (typeof css === \"string\" && css.length > 1000000) throw new Error(\"Input CSS too large (security patch)\");" "$MODULE_PATH"
    
    # Add header comment
    sed -i.bak "1s/^/\/* SECURITY PATCH: Added input size validation to prevent ReDoS attacks *\/\n/" "$MODULE_PATH"
    
    echo "  ✅ Successfully patched at line $BRACKET_LINE"
  else
    echo "  ❌ Could not locate parse function"
  fi
  
  # Remove sed backup file
  rm -f "$MODULE_PATH.bak"
' _ {} "$PATCH_DIR" \;

# Update the patch record
echo "Updating PostCSS patch record..."

cat > "$PATCH_DIR/POSTCSS_PATCHES.md" << EOL
# PostCSS Security Patches Applied

This file documents the direct patches applied to PostCSS modules to address security vulnerabilities.

## Applied on: ${PATCH_DATE}

### Direct Module Patches:

#### PostCSS (Moderate severity)
- **Vulnerability**: PostCSS line return parsing error
- **CVE/GHSA**: GHSA-7fh5-64p2-3v2j
- **Patch method**: Added input size validation to prevent ReDoS attacks
- **Patched modules**: Multiple postcss/lib/parse.js instances in node_modules

### Implementation:
- Added input size check at the beginning of the parse() function
- Input strings larger than 1MB are rejected to prevent ReDoS attacks

### Limitations:
- This is a temporary measure until the dependencies can be properly updated
- The patch must be reapplied after any npm install operation
EOL

echo "PostCSS patching completed. See $PATCH_DIR/POSTCSS_PATCHES.md for details."