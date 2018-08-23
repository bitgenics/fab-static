const fse = require('fs-extra')

const doBundle = require('./bundle')
const toIntermediate = require('./intermediate')

const HOUR_IN_SEC = 60 * 60

const defaultConfig = {
  buildDir: 'build',
  cacheRedirect: HOUR_IN_SEC,
  cacheStatic: HOUR_IN_SEC,
  distDir: 'fab-dist',
  includeFiles: ['**/*', '!asset-manifest.json'],
  injectHtmls: true,
  inputDir: '.',
  outputDir: '.',
  redirectToAssets: true,
  staticDirName: 'static',
}

const getConfig = () => {
  const customConfigLocation = process.argv.length > 2 ? 
    process.argv[3] : './fab-static.config.js'

  if(fse.existsSync(customConfigLocation)) {
    const customConfig = require(customConfigLocation)
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