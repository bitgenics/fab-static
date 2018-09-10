const path = require('path')
const util = require('util')

const cheerio = require('cheerio')
const fse = require('fs-extra')
const globby = require('globby')

const templ = require('./template')

const resolvePaths = (config) => {
  config.distDir = path.resolve(config.outputDir, config.distDir)
  config.tmpDir = path.resolve(config.distDir, 'tmp')
  config.buildDir = path.resolve(config.inputDir, config.buildDir)
  config.packageDir = path.resolve(config.outputDir, 'fab-package')
  config.serverDir = path.join(config.packageDir, 'server')
  return config
}

const copyFiles = async (glob, src, dest) => {
  fse.ensureDir(dest)
  const files = await globby(glob, { cwd: src })
  const promises = files.map((file) => {
    const srcFile = path.join(src, file)
    const destFile = path.join(dest, file)
    return fse.copy(srcFile, destFile)
  })
  await Promise.all(promises)
}

const copyAssets = async (config, dirName = '_assets') => {
  const assetsDir = path.join(config.packageDir, '_assets')
  await fse.copy(path.resolve(config.buildDir, dirName), assetsDir)
}

const copyIncludes = async (config) => {
  const includeDir = path.resolve(config.packageDir, 'include')
  config.includeFiles.push(`!_assets`)
  if (config.redirectToAssets) {
    config.includeFiles.push(`!${config.staticDirName}`)
  }
  config.includeFiles.push('!**/*.html')
  await copyFiles(config.includeFiles, config.buildDir, includeDir)
  const bundleConfig = {
    injectHtmls: config.injectHtmls,
  }
  const bundleConfigPath = path.join(config.packageDir, 'bundleConfig.js')
  await fse.writeFile(bundleConfigPath, `module.exports = ${JSON.stringify(bundleConfig)}`)
}

const initCode =
  'var ENV_SETTINGS = {{settings}}\n \
  window.EnvSettings = ENV_SETTINGS\n \
  var CSP_NONCE = "{{nonce}}"\n \
  window.CspNonce = CSP_NONCE\n'

const transformHtml = async (file, src, dest) => {
  const html = await fse.readFile(path.resolve(src, file), {
    encoding: 'utf-8'
  })
  let escaped = html.replace(/({{)/g, '\\{\\{')
  escaped = escaped.replace(/(}})/g, '\\}\\}')
  const $ = cheerio.load(escaped)
  $('head').prepend(
    `<script type="application/javascript">${initCode}</script>`
  )
  $('script').attr('nonce', '{{nonce}}')

  const js = templ($.html())
  const jsFile = path.resolve(dest, `${file}.js`)
  await fse.writeFile(jsFile, js)
  return jsFile
}

const generateCode = (contents) => {
  let code = 'const urls = {}\n'
  Object.keys(contents).forEach(url => {
    code = code.concat(`urls['/${url}'] = ${contents[url]}\n`)
  })
  code = code.concat('module.exports = urls')
  return code
}

const transformHtmls = async (config) => {
  await fse.ensureDir(config.serverDir)
  const files = await globby('**/*.html', { cwd: config.buildDir })
  const promises = files.map(async (file) => {
    return await transformHtml(file, config.buildDir, config.serverDir)
  })
  const jsFiles = await Promise.all(promises)
  const urls = {}
  files.forEach((file, index) => {
    urls[file] = `require('${jsFiles[index]}')`
  })
  const htmlsFile = path.join(config.serverDir, '_htmls.js')
  const code = generateCode(urls)
  fse.writeFile(htmlsFile, code)
}

const createServer = async (config) => {
  const hostConfig = {
    redirectToAssets: config.redirectToAssets,
    staticDirName: config.staticDirName,
    cacheRedirect: config.cacheRedirect,
  }
  await fse.ensureDir(config.serverDir)
  const hostConfigPath = path.join(config.serverDir, 'config.js')
  await fse.writeFile(hostConfigPath, `module.exports = ${JSON.stringify(hostConfig)}`)
  const serverPath = path.join(config.serverDir, 'entry.js')
  await fse.copy(path.join(__dirname, 'server.js'), serverPath)
}

const toIntermediate = async (config) => {
  resolvePaths(config)
  await fse.remove(config.packageDir)
  await fse.remove(config.distDir)
  if (config.redirectToAssets) {
    console.log(`Copying assets from ${config.staticDirName}`)
    await copyAssets(config, config.staticDirName)
  } else {
    console.log(`Copying _assets dir`)
    await copyAssets(config)
  }
  console.log('Copying remaining assets')
  await copyIncludes(config)
  console.log('Injecting settings code into HTML files')
  await transformHtmls(config)
  console.log('Generating the server code')
  await createServer(config)
}

module.exports = toIntermediate
