// babel is solely needed as jest-esbuild fallsback to babel in some cases, see
// - https://github.com/aelbore/esbuild-jest/issues/21
// - https://github.com/babel/babel/issues/13094
module.exports = {
  presets: ['@babel/preset-typescript'],
};
