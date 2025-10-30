const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/layout.tsx',
    '!app/**/page.tsx',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    // Exclude frontend components (should be tested with component/e2e tests)
    '!app/admin/**',
    '!app/game/**',
    '!app/host/**',
    '!app/join/**',
    '!app/quizzes/**',
    '!app/components/**',
    // Exclude generated code
    '!app/generated/**',
    // Exclude SSE endpoints (not testable with Jest)
    '!app/api/game/session/[sessionId]/events/**',
    // Exclude server-only i18n config (requires Next.js runtime)
    '!lib/i18n.ts',
    // Exclude client i18n utilities (simple re-exports)
    '!lib/i18nClient.ts',
    // Exclude Prisma singleton (singleton pattern, no logic to test)
    '!lib/prisma.ts',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/__mocks__/',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
