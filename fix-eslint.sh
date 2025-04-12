#!/bin/bash

# ESLint 설정 수정 스크립트

# 모든 패키지에 ESLint 설정 파일 생성
echo "모든 패키지에 ESLint 설정 파일 생성 중..."

# 패키지 목록
PACKAGES=("api-client" "database" "shared")

for pkg in "${PACKAGES[@]}"; do
  echo "packages/$pkg 패키지의 ESLint 설정 생성..."
  
  # .eslintrc.js 파일 생성
  cat > "packages/$pkg/.eslintrc.js" << 'EOL'
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'caughtErrorsIgnorePattern': '^_'
    }],
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    'no-unreachable': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-case-declarations': 'off',
    'no-empty': 'warn',
    'no-constant-condition': 'warn',
    '@typescript-eslint/no-empty-function': 'off'
  }
};
EOL

done

# API 패키지의 pylintrc 파일 수정
echo "API 패키지의 pylintrc 파일 수정..."
sed -i'.bak' '/C0330/d; /C0326/d' packages/api/.pylintrc 2>/dev/null || sed -i '' '/C0330/d; /C0326/d' packages/api/.pylintrc

# 루트 디렉토리의 ESLint 설정 수정
echo "루트 디렉토리의 ESLint 설정 수정..."
sed -i'.bak' '1s/^/module.exports = {\n  root: true,\n  ignorePatterns: ["packages\/**\/*"],\n/' .eslintrc.js 2>/dev/null || sed -i '' '1s/^/module.exports = {\n  root: true,\n  ignorePatterns: ["packages\/**\/*"],\n/' .eslintrc.js

echo "ESLint 설정 수정 완료!" 