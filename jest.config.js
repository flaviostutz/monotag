// eslint-disable-next-line import/no-commonjs
module.exports = {
  testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(tsx?|json?)$': [
      'esbuild-jest',
      {
        sourcemap: true, // correct line numbers in code coverage
      },
    ],
  },
  collectCoverage: false,
  collectCoverageFrom: ['./src/**'],
  coverageThreshold: {
    global: {
      lines: 50,
      branches: 50,
      functions: 50,
    },
  },
};
