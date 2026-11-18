/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: {
      statements: 98,
      branches: 98,
      functions: 98,
      lines: 98
    }
  }
};
