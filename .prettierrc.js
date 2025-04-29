module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  printWidth: 100,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  bracketSpacing: true,
  jsxBracketSameLine: false,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  useTabs: false,
  overrides: [
    {
      files: '*.{json,yml,yaml,md}',
      options: {
        tabWidth: 2,
      },
    },
  ],
};