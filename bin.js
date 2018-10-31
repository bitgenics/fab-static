#!/usr/bin/env node
const fse = require('fs-extra')
const path = require('path')

const doBundle = require('./bundle')
const toIntermediate = require('./intermediate')

const defaultConfig = {
  buildDir: 'build',
  distDir: 'fab-dist',
  includeFiles: ['**/*', '!asset-manifest.json'],
  injectHtmls: true,
  inputDir: '.',
  outputDir: '.',
  redirectToAssets: true,
  serverDir: 'server',
  staticDirName: 'static',
}

const getConfig = () => {
  const customConfigLocation =
    process.argv.length > 2 ? process.argv[2] : './fab-static.config.js'

  if (fse.existsSync(customConfigLocation)) {
    const customConfig = require(path.resolve(customConfigLocation))
    return Object.assign({}, defaultConfig, customConfig)
  } else {
    return defaultConfig
  }
}

const run = async () => {
  const config = getConfig()
  await toIntermediate(config)
  await doBundle(config.packageDir, config.distDir)
}

run()
