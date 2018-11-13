const url_parse = require('url').parse
const mime = require('mime-types')

const HOUR_IN_SEC = 60 * 60

const default_config = {
  cacheRedirect: HOUR_IN_SEC,
  cacheStatic: HOUR_IN_SEC,
  staticDirPath: 'static',
  redirectToAssets: true,
}

let custom_config = {}
try {
  custom_config = require('./fab.config.js')
} catch (e) {}
const config = Object.assign({}, default_config, custom_config)
console.log({ config })

const STATIC_DIR_PATH = `/${config.staticDirPath}`

let files = {}
let htmls = {}
try {
  files = require('./_includes.js')
} catch (e) {
  console.log('_includes,', e)
}

try {
  htmls = require('./_htmls.js')
} catch (e) {
  console.log('_htmls,', e)
}

console.log({ files })
console.log({ htmls })

const getPath = (url) => {
  let pathname = url_parse(url).pathname
  if (pathname.endsWith('/')) {
    pathname += 'index.html'
  }
  return pathname
}

const sendHeaders = async (req, res, settings) => {
  let headers = config.getHeaders ? config.getHeaders(req, res, settings) : []
  headers = headers || []
  if (headers && typeof headers.then == 'function') {
    headers = await headers
  }
  for (header of headers) {
    res.setHeader(header.name, header.value)
  }
}

const getContentType = (pathname) => {
  const mimeType = mime.lookup(pathname)
  return mimeType ? mime.contentType(mimeType) : 'text/html; charset=utf-8'
}

const handleRedirectToAssets = (req, res, _, next) => {
  const pathname = getPath(req.url)
  if (config.redirectToAssets && pathname.startsWith(STATIC_DIR_PATH)) {
    console.log('redirecting!')
    const location = pathname.replace(STATIC_DIR_PATH, '/_assets')
    res.statusCode = 302
    res.setHeader('Cache-Control', `public, max-age=${config.cacheRedirect}`)
    res.setHeader('Location', location)
    res.end()
  } else {
    next()
  }
}

const handleHTML = (req, res, settings, next) => {
  const pathname = getPath(req.url)
  console.log(req.headers)
  const accepts_html = true //(req.headers.accept || '').match(/html/)
  // console.log({pathname, accepts_html})
  const html_handler = htmls[pathname]
    ? htmls[pathname]
    : accepts_html
    ? htmls['/200.html']
    : null

  if (html_handler) {
    res.statusCode = 200
    res.setHeader('Content-Type', getContentType(pathname))
    res.setHeader('Cache-Control', 'no-cache')
    const data = {
      settings: JSON.stringify(settings),
      nonce: 'abcde12345',
    }
    html_handler.renderToStream(res, data)
    return res.end()
  } else {
    next()
  }
}

const handleFiles = (req, res, _, next) => {
  const pathname = getPath(req.url)
  if (files[pathname]) {
    const content = files[pathname]
    const charset = content instanceof String ? 'utf-8' : undefined
    res.statusCode = 200
    res.setHeader('Content-Type', getContentType(pathname))
    res.setHeader('Cache-Control', `public, max-age=${config.cacheStatic}`)
    res.end(content, charset)
  } else {
    next()
  }
}

const handle404 = (_, res) => {
  res.statusCode = 404
  res.end()
}

const getRequestHandler = (handlers) => (req, res, settings) => {
  let count = 0
  const handle = () => {
    console.log({ count })
    handlers[count](req, res, settings, () => {
      count++
      handle()
    })
  }
  handle()
}

const handler = getRequestHandler([
  handleRedirectToAssets,
  handleFiles,
  handleHTML,
  handle404,
])

const renderGet = async (req, res, settings) => {
  try {
    console.log(getPath(req.url))
    await sendHeaders(req, res, settings)
    handler(req, res, settings)
  } catch (e) {
    if (!res.headersSent) {
      res.statusCode = 500
    }
    console.log(e)
  } finally {
    res.end()
  }
}

module.exports = { renderGet }
