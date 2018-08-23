const path = require('path')

const fse = require('fs-extra')
const globby = require('globby')

const resolvePaths = (config) => {
  config.distDir = path.resolve(config.outputDir, config.distDir)
  config.tmpDir = path.resolve(config.distDir, 'tmp')
  config.buildDir = path.resolve(config.inputDir, config.buildDir)
  config.staticDir = path.resolve(config.buildDir, config.staticDirName)
  config.packageDir = path.resolve(config.outputDir, 'fab-package')
  return config
}

const copyFiles = async (glob, src, dest) => {
  fse.ensureDir(dest)
  const files = await globby(glob, { cwd: src })
  console.log({files})
  const promises = files.map((file) => {
    const srcFile = path.join(src, file)
    const destFile = path.join(dest, file)
    console.log(`Copying ${srcFile} to ${destFile}`)
    return fse.copy(srcFile, destFile)
  })
  await Promise.all(promises)
}

const copyAssets = async (config) => {
  const assetsDir = path.join(config.packageDir, '_assets')
  await fse.copy(config.staticDir, assetsDir)
}

const copyIncludes = async (config) => {
  const includeDir = path.resolve(config.packageDir, 'include')
  config.includeFiles.push(`!${config.staticDirName}`)
  await copyFiles(config.includeFiles, config.buildDir, includeDir)
  const bundleConfig = {
    injectHtmls: config.injectHtmls,
  }
  const bundleConfigPath = path.join(config.packageDir, 'bundleConfig.js')
  await fse.writeFile(bundleConfigPath, `module.exports = ${JSON.stringify(bundleConfig)}`)
}

const createServer = async (config) => {
  const hostConfig = {
    redirectToAssets: config.redirectToAssets,
    staticDirName: config.staticDirName,
    cacheRedirect: config.cacheRedirect,
    cacheStatic: config.cacheStatic,
  }
  const serverDir = path.join(config.packageDir, 'server')
  await fse.ensureDir(serverDir)
  const hostConfigPath = path.join(serverDir, 'config.js')
  await fse.writeFile(hostConfigPath, `module.exports = ${JSON.stringify(hostConfig)}`)
  const serverPath = path.join(serverDir, 'entry.js')
  await fse.copy(path.join(__dirname, 'server.js'), serverPath)
}

const toIntermediate = async (config) => {
  resolvePaths(config)
  await copyAssets(config)
  await copyIncludes(config)
  await createServer(config)
}

module.exports = toIntermediate