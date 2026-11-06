/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          esModuleInterop: true,
          resolveJsonModule: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    // Allow '.js' extension imports from TypeScript source files
    '^(\\.\\.?/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/cli.ts'],
  coverageDirectory: 'coverage',
};
