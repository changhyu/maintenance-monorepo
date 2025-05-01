module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '!src'
  ],
  rules: {
    // Add package-specific rules here
  }
};