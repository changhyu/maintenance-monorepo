module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier', // Prettier와 충돌 방지
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.local.json'],
    tsconfigRootDir: __dirname
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y',
    'import',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        paths: ['src']
      },
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.local.json'],
        tsconfigRootDir: __dirname
      }
    },
    'import/ignore': ['node_modules', 'dist', '.json$', '.(scss|less|css|styl)$'],
  },
  rules: {
    // 오류 수준 규칙 (error)
    'react-hooks/rules-of-hooks': 'error',
    'no-console': 'off', // 콘솔 오류 비활성화
    'no-var': 'error',
    'prefer-const': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    
    // TypeScript 타입 오류 비활성화
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    
    // import 관련 규칙 완화
    'import/no-unresolved': 'off', // 모듈 해석 오류 비활성화
    'import/named': 'off',
    'import/default': 'off',
    'import/no-absolute-path': 'off',
    'import/no-self-import': 'off',
    'import/no-named-as-default': 'off',
    'import/namespace': 'off',
    'import/no-duplicates': 'off',

    // 경고 수준 규칙 (warn)
    'react-hooks/exhaustive-deps': 'off', // React Hook 의존성 규칙 비활성화
    
    // 접근성 규칙 완전 비활성화
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/alt-text': 'off',
    'jsx-a11y/interactive-supports-focus': 'off',
    
    // React 관련 규칙
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/display-name': 'off',
    'react/jsx-key': 'off', // 배열 요소 key 오류 비활성화
    
    // 추가된 규칙
    'no-unused-vars': 'off',
    'prettier/prettier': 'off',
    'import/extensions': 'off', // 확장자 체크 비활성화
    'no-case-declarations': 'off', // case문 내 선언 허용

    // 타입 관련 규칙 완화
    '@typescript-eslint/ban-types': 'off', // Function, {} 등의 타입 허용
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-this-alias': 'off',

    // unknown 타입 오류 무시
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',

    // 파일 확장자 관련 규칙
    'react/jsx-filename-extension': ['warn', { extensions: ['.jsx', '.tsx'] }],

    // 임포트 순서
    'import/order': 'off',
  },
  overrides: [
    // 테스트 파일에 대한 예외 규칙
    {
      files: ['**/*.test.tsx', '**/*.test.ts', '**/*.spec.tsx', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
    // 설정 파일에 대한 예외 규칙
    {
      files: [
        '*.config.js',
        '*.config.ts',
        'vite.config.js',
        'vite.config.ts',
        'tailwind.config.js',
        'postcss.config.js',
      ],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
    // index 파일에 대한 규칙
    {
      files: ['**/index.js', '**/index.ts', '**/index.tsx'],
      rules: {
        'import/export': 'off',
      }
    },
    // 타입 선언 파일에 대한 규칙
    {
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'import/no-duplicates': 'off',
        'import/order': 'off',
        'no-undef': 'off',
      }
    },
    // 컴포넌트 파일에 대한 규칙
    {
      files: ['**/components/**/*.tsx', '**/pages/**/*.tsx'],
      rules: {
        'react/jsx-key': 'off',
        'react/display-name': 'off',
      }
    },
    // 서비스 파일에 대한 특별 규칙
    {
      files: ['**/services/**/*.ts', '**/services/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off', 
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-case-declarations': 'off'
      }
    }
  ],
  // 전역 변수 설정
  globals: {
    window: 'readonly',
    document: 'readonly',
    google: 'readonly',
    NodeJS: 'readonly',
  }
}; 