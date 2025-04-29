module.exports = {
  root: true,
  ignorePatterns: [
    'dist/',
    'build/',
    'coverage/',
    'node_modules/',
    '.env',
    '.env.*',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y', 'import', 'prettier'],
  rules: {
    // 타입스크립트 규칙 완화 (점진적 개선을 위해)
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'react-hooks/exhaustive-deps': 'warn',

    // 코드 품질 규칙
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    'no-var': 'error',

    // JSX 관련 규칙
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-namespace': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',

    // JSX 타입 검사 규칙
    '@typescript-eslint/no-empty-interface': 'warn',
    'react/prop-types': 'off',
    'react/display-name': 'off',

    // 접근성 규칙 조정 - 일부 유지
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/no-noninteractive-element-interactions': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',

    // 효율적인 개발을 위한 추가 설정
    'no-unreachable': 'warn',
    'import/no-anonymous-default-export': 'warn',

    // 타입 안전성 규칙
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'no-case-declarations': 'warn',
    'no-empty': 'warn',
    'no-constant-condition': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',

    // 추가 품질 규칙
    'no-duplicate-imports': 'error',
    'no-template-curly-in-string': 'warn',
    'no-unused-expressions': 'warn',
    'no-use-before-define': 'warn',
    'require-await': 'warn',
    'import/first': 'warn',
    'import/newline-after-import': 'warn',
    'import/no-duplicates': 'warn',
    'prettier/prettier': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {},
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  // 특정 파일 패턴에 대한 오버라이드 설정
  overrides: [
    {
      files: ['*.test.tsx', '*.test.ts', '*.spec.tsx', '*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: ['vite.config.js', 'tailwind.config.js', 'postcss.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
        'import/no-duplicates': 'off',
        'no-undef': 'off',
      },
    },
    {
      // 서비스 파일에 대한 특별 규칙 - 점진적으로 수정 예정
      files: ['**/services/**/*.ts', '**/services/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/ban-types': 'warn',
      },
    },
  ],
};
