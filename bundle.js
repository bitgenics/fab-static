const path = require('path')
const util = require('util')

const fse = require('fs-extra')
const globby = require('globby')
const webpack = require('webpack')
const zip = util.promisify(require('deterministic-zip'))

const createWebpackConfig = require('./webpack.config.server.js')

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
  const server_config = createWebpackConfig(tmpServerDir, distServerDir)

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

const doZip = async (distDir) => {
  const zipfile = path.join(distDir, 'fab.zip')
  const options = {
    includes: ['./server/**', './_assets/**'],
    cwd: distDir
  }
  await zip(distDir, zipfile, options)
}

const doBundle = async (src, dest) => {
  await fse.emptyDir(dest)
  const config = require(path.join(src, 'bundleConfig.js'))
  console.log('Bundling static assets')
  await bundleAssets(src, dest)
  console.log('Bundling server-side code')
  await bundleServer(src, dest)
  console.log('Zipping it all up')
  await doZip(dest)
}

module.exports = doBundle