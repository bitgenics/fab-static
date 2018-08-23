const path = require('path')
const webpack = require('webpack')

const createConfig = (srcDir, targetDir) => {
  console.log(path.resolve(__dirname, 'node_modules'))
  const options = {
    mode: 'production',
    entry: {
      'bundle': [path.resolve(srcDir, 'entry.js')]
    },
    target: 'node',
    resolve: {
      alias: {
        '_includes': path.resolve(srcDir, '_includes.js'),
        'fab-fs': path.resolve(srcDir, 'fab-fs.js'),
      },
      modules: [
        'node_modules',
        path.resolve(__dirname, 'node_modules')
      ],
    },
    resolveLoader: {
      modules: ['node_modules', path.resolve(__dirname, 'node_modules')]
    },
    module: {
      rules: [
        {
          test: /\.marko$/,
          loader: 'marko-loader',
          options: {
            target: 'browser'
          }
        }
      ]
    },
    optimization: {
      minimize: false
    },
    output: {
      path: targetDir,
      filename: '[name].js',
      library: 'server',
      libraryTarget: 'commonjs2'
    },
    plugins: [new webpack.DefinePlugin({ 'process.env': { BUNDLE: '"true"' } })]
  }
  return options
}

module.exports = createConfig
