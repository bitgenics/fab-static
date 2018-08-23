const path = require('path')

const fse = require('fs-extra')
const globby = require('globby')
const webpack = require('webpack')

const createWebpackConfig = require('./webpack.config.server.js')

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
  await copyAssets(config)
  await copyIncludes(config)
  await createServer(config)
}

const readIncludes = async (includesDir) => {
  const files = await globby(['**/*'], { cwd: includesDir })
  let contents = files.map(file => {
    file = path.join(includesDir, file)
    return fse.readFile(file, { encoding: 'base64' })
  })
  contents = await Promise.all(contents)
  const urls = {}
  files.forEach((file, index) => {
    urls[file] = `Buffer.from('${contents[index]}', 'base64')`
  })
  return urls
}

const createImportCode = (contents) => {
  let code = 'const urls = {}\n'
  Object.keys(contents).forEach(url => {
    code = code.concat(`urls['/${url}'] = ${contents[url]}\n`)
  })
  code = code.concat('module.exports = urls')
  return code
}

const bundleIncludes = async (src, serverDir) => {
  const files = await readIncludes(path.join(src, 'include'))
  const code = createImportCode(files)
  const includeFile = path.join(serverDir, '_includes.js')
  await fse.writeFile(includeFile, code)
  return includeFile
}

const copyTmpServerFiles = async (packageDir, serverDestDir) => {
  const serverSrcDir = path.join(packageDir, 'server')
  await fse.ensureDir(serverSrcDir)

  await fse.copy(serverSrcDir, serverDestDir)
}

const bundleAssets = async (packageDir, distDir) => {
  const assetsSrcDir = path.join(packageDir, '_assets')
  const assetsDestDir = path.join(distDir, '_assets')
  await fse.copy(assetsSrcDir, assetsDestDir)
}

const webpackerize = async (tmpServerDir, distDir) => {
  const distServerDir = path.join(distDir, 'server')
  console.log({distServerDir})
  const server_config = createWebpackConfig(tmpServerDir, distServerDir)
  console.log({server_config})

  return new Promise((resolve, reject) => {
    webpack(server_config, (err, stats) => {
      if (err) return reject(err)
      const errors = stats.toJson('errors-only').errors.toString()
      if (errors) return reject(errors)
      resolve()
    })
  })
}

const bundleServer = async (src, dest) => {
  const tmpDir = path.join(dest, 'tmp')
  const tmpServerDir = path.join(tmpDir, 'server')

  await copyTmpServerFiles(src, tmpServerDir)

  const includeFile = await bundleIncludes(src, tmpServerDir)
  await webpackerize(tmpServerDir, dest)
  await fse.remove(tmpDir)
}

const doBundle = async (src, dest) => {
  await fse.emptyDir(dest)
  const config = require(path.join(src, 'bundleConfig.js'))
  await bundleAssets(src, dest)
  await bundleServer(src, dest)
}

const run = async () => {
  const config = resolvePaths(getConfig())
  console.log({config})
  await toIntermediate(config)
  doBundle(config.packageDir, config.distDir)
}

run()