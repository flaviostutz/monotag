module.exports = {
  parserOptions: {
    // needed by some typescript rules
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: __dirname,
  },
  extends: '@stutzlab/eslint-config',
};
