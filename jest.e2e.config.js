module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  globalSetup: '<rootDir>/tests/e2e/setup.ts',
  testTimeout: 30000, // 30 seconds for E2E tests
  maxWorkers: 1, // Run E2E tests sequentially
};