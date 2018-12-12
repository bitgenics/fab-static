const path = require('path')
const webpack = require('webpack')

const createConfig = (srcDir, targetDir) => {
  const options = {
    mode: 'production',
    entry: {
      server: [path.resolve(srcDir, 'entry.js')],
    },
    target: 'webworker',
    resolve: {
      alias: {
        _includes: path.resolve(srcDir, '_includes.js'),
      },
      modules: ['node_modules', path.resolve(__dirname, 'node_modules')],
    },
    resolveLoader: {
      modules: ['node_modules', path.resolve(__dirname, 'node_modules')],
    },
    optimization: {
      minimize: false,
    },
    output: {
      path: targetDir,
      filename: '[name].js',
      library: 'server',
      libraryTarget: 'commonjs2',
    },
    plugins: [
      new webpack.DefinePlugin({ 'process.env': { BUNDLE: '"true"' } }),
    ],
  }
  return options
}

module.exports = createConfig
