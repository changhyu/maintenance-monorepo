module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
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
    // Type safety 관련 규칙
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'caughtErrorsIgnorePattern': '^_'
    }],
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    
    // 데이터베이스 관련 규칙
    'no-await-in-loop': 'warn', // 데이터베이스 쿼리에서 루프 내 await 사용 주의
    'no-promise-executor-return': 'error', // Promise 실행자에서 값 반환 방지
    'require-atomic-updates': 'error', // 비동기 작업에서 상태 업데이트 주의
    
    // 기타 규칙
    'no-unreachable': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-case-declarations': 'off',
    'no-empty': 'warn',
    'no-constant-condition': 'warn',
    '@typescript-eslint/no-empty-function': 'off'
  }
};
