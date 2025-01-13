module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true
  },
  preset: 'ts-jest',
  testEnvironment: 'node',

  extends: 'standard',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
  }
}
