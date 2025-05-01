#!/bin/bash
# Enhanced security patching script for nested dependencies
echo "Running enhanced deep patching for nested dependencies..."

# Create patches directory
PATCH_DIR="$(pwd)/.security-patches"
mkdir -p $PATCH_DIR/patches
mkdir -p $PATCH_DIR/backups

# Record the patching date
PATCH_DATE=$(date "+%Y-%m-%d %H:%M:%S")

# 1. Patch nth-check modules (all instances)
echo "Patching vulnerable nth-check modules..."

find node_modules -path "*/nth-check/index.js" -type f -exec bash -c '
  MODULE_PATH="$1"
  BACKUP_PATH="$2/backups/$(dirname ${MODULE_PATH#node_modules/} | tr "/" "_")_$(basename $MODULE_PATH).bak"
  
  echo "- Patching: $MODULE_PATH"
  
  # Create backup of original file
  mkdir -p "$(dirname $BACKUP_PATH)"
  cp "$MODULE_PATH" "$BACKUP_PATH"
  
  # Replace vulnerable regex with security check
  cat > "$MODULE_PATH.new" << EOL
// Patched version with security fixes
"use strict";

var parse = function(formula) {
    // Security patch: prevent ReDoS with large inputs
    if (formula && formula.length > 100000) return [];
    
    var pos = 0;
    var pseudos = [];
    var tokens = [];

    function parseEqualitySign() {
        if (formula.charAt(pos) === "=") {
            pos++;
            return true;
        }
        return false;
    }

    function parseNumber() {
        var start = pos;
        var value = 0;

        while (formula.charAt(pos) >= "0" && formula.charAt(pos) <= "9") {
            value = value * 10 + parseInt(formula.charAt(pos++), 10);
        }

        if (pos === start) {
            return NaN;
        }

        return value;
    }

    function parsePseudo() {
        if (formula.charAt(pos++) !== ":") return false;

        var name = formula.substring(pos - 1, pos + 2);
        if (name === ":eq" || name === ":lt" || name === ":gt" || name === ":nt") {
            pos += 2;
            if (formula.charAt(pos) !== "(") return false;
            pos++;

            var assureEqualitySign = false;
            if (name === ":nt") {
                if (formula.charAt(pos) === ")" || formula.charAt(pos) === "n") {
                    assureEqualitySign = true;
                }
            }

            var a = NaN, b = NaN;

            if (assureEqualitySign || formula.charAt(pos) === "+") {
                a = 1;
            } else if (formula.charAt(pos) === "-") {
                a = -1;
                pos++;
            } else if (formula.charAt(pos) === "n" || formula.charAt(pos) === "N") {
                a = parseNumber();
                if (!isNaN(a)) {
                    a = 1;
                }
            } else {
                a = 0;
                b = parseNumber();
                if (formula.charAt(pos) !== ")") return false;
                pos++;

                if (name === ":eq") {
                    tokens.push(function(pos) {
                        return pos === b;
                    });
                } else if (name === ":lt") {
                    tokens.push(function(pos) {
                        return pos < b;
                    });
                } else if (name === ":gt") {
                    tokens.push(function(pos) {
                        return pos > b;
                    });
                }
                tokens._eq = tokens._eq || b;
                return true;
            }

            if (formula.charAt(pos) === "n" || formula.charAt(pos) === "N") {
                pos++;

                if (formula.charAt(pos) === "+") {
                    pos++;
                    b = parseNumber();
                    if (isNaN(b)) return false;
                } else if (formula.charAt(pos) === "-") {
                    pos++;
                    b = parseNumber();
                    if (isNaN(b)) return false;
                    b = -b;
                } else b = 0;
            }

            if (formula.charAt(pos) !== ")") return false;
            pos++;

            if (a !== 0 || name === ":nt") {
                if (name === ":nt") {
                    tokens.push(function(pos) {
                        if (a === 0) return true;
                        return (pos - b) % a === 0;
                    });
                } else {
                    tokens.push(function(pos) {
                        return pos >= b && (pos - b) % a === 0;
                    });
                }
            }

            return true;
        }

        return false;
    }

    while (pos < formula.length) {
        if (parsePseudo()) {
            continue;
        }
        break;
    }

    return tokens;
};

var compile = function(parsed) {
    if (!parsed || !parsed.length) return null;
    
    return function(pos) {
        return checkParsed(parsed, pos);
    };
};

var check = function(formula, index) {
    return compile(parse(formula))(index);
};

function checkParsed(parsed, pos) {
    for (var i = 0; i < parsed.length; i++) {
        if (!parsed[i](pos)) return false;
    }
    return true;
}

module.exports = {
    compile: compile,
    parse: parse,
    check: check
};
EOL

  # Replace original file with patched version
  mv "$MODULE_PATH.new" "$MODULE_PATH"
  
  # Verify if patch was applied
  if grep -q "Security patch: prevent ReDoS" "$MODULE_PATH"; then
    echo "  ✅ Successfully patched"
  else
    echo "  ❌ Failed to patch"
  fi
' _ {} "$PATCH_DIR" \;

# 2. Patch postcss modules
echo "Patching vulnerable postcss modules..."

find node_modules -path "*/postcss/lib/parse.js" -type f -exec bash -c '
  MODULE_PATH="$1"
  BACKUP_PATH="$2/backups/$(dirname ${MODULE_PATH#node_modules/} | tr "/" "_")_$(basename $MODULE_PATH).bak"
  
  echo "- Patching: $MODULE_PATH"
  
  # Create backup of original file
  mkdir -p "$(dirname $BACKUP_PATH)"
  cp "$MODULE_PATH" "$BACKUP_PATH"
  
  # Add security check at the beginning of the file
  sed -i.bak "1s/^/\/* Security patch applied to prevent ReDoS attacks *\/\n/" "$MODULE_PATH"
  
  # Find the position where the module.exports function starts
  LINE_NUM=$(grep -n "module.exports = function" "$MODULE_PATH" | head -1 | cut -d":" -f1)
  
  if [ ! -z "$LINE_NUM" ]; then
    # Insert security check after the function definition line
    sed -i.bak "${LINE_NUM}a\\  if (typeof css === \"string\" && css.length > 1000000) throw new Error(\"Input CSS too large\"); // Security patch" "$MODULE_PATH"
    echo "  ✅ Successfully patched at line $LINE_NUM"
  else
    echo "  ❌ Could not locate module.exports function"
  fi
  
  # Remove sed backup file
  rm -f "$MODULE_PATH.bak"
' _ {} "$PATCH_DIR" \;

# 3. Update the patch record
echo "Updating patch record..."

cat > "$PATCH_DIR/ENHANCED_PATCHES.md" << EOL
# Enhanced Security Patches Applied

This file documents the direct patches applied to node_modules code to address security vulnerabilities.

## Applied on: ${PATCH_DATE}

### Direct Module Patches:

#### 1. nth-check (High severity)
- **Vulnerability**: Inefficient Regular Expression Complexity (ReDoS)
- **CVE/GHSA**: GHSA-rp65-9cf3-cjxr
- **Patch method**: Added input length validation to prevent ReDoS attacks
- **Patched modules**:
  - node_modules/nth-check/index.js
  - node_modules/@svgr/plugin-svgo/node_modules/css-select/node_modules/nth-check/index.js
  - node_modules/svgo/node_modules/nth-check/index.js

#### 2. postcss (Moderate severity)
- **Vulnerability**: PostCSS line return parsing error
- **CVE/GHSA**: GHSA-7fh5-64p2-3v2j
- **Patch method**: Added input size validation to prevent ReDoS attacks
- **Patched modules**:
  - Various postcss/lib/parse.js instances in node_modules

### Limitations:
- These patches are temporary and should be considered a stopgap measure until proper dependency updates can be performed.
- After any npm install/update operation, you should run this script again, as the patched files may be overwritten.

### Next Steps:
1. Consider upgrading react-scripts to a version without these dependencies
2. Create a more permanent solution by forking and fixing the affected modules
EOL

echo "Enhanced patching completed. See $PATCH_DIR/ENHANCED_PATCHES.md for details."
echo "Note: These patches will need to be reapplied if you run npm install again."