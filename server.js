const url_parse = require('url').parse
const mime = require('mime-types')

const files = require ("./_includes.js")
const config = require('./config')

const STATIC_DIR_PATH = `/${config.staticDirName}`

const getPath = url => {
  let pathname = url_parse(url).pathname
  if (pathname.endsWith('/')) {
    pathname += 'index.html'
  }
  return pathname
}

const sendRedirect = (res, location) => {
  res.statusCode = 302
  res.setHeader('Cache-Control', `public, max-age=${config.cacheRedirect}`)
  res.setHeader('Location', location)
}

const getContentType = pathname => {
  const mimeType = mime.lookup(pathname)
  return mimeType ? mime.contentType(mimeType) : 'text/html; charset=utf-8'
}

const renderGet = (req, res, settings) => {
  try {
    const pathname = getPath(req.url)
    console.log({pathname})
    if(config.redirectToAssets && pathname.startsWith()) {
      const location = pathname.replace(STATIC_DIR_PATH, '/_assets')
      return sendRedirect(res, location)
    }
    
    res.statusCode = 200
    res.setHeader('Content-Type', getContentType(pathname))
    const content = files[pathname]

    if (content instanceof String) {
      res.setHeader('Cache-Control', `public, max-age=${config.cacheStatic}`)
      res.end(content, 'utf-8')
    } else if (content instanceof Buffer) {
      res.setHeader('Cache-Control', `public, max-age=${config.cacheStatic}`)
      res.end(content)
    } else if (content.renderToString) {
      res.setHeader('Cache-Control', 'no-cache')
      const html = content.renderToString({
        settings,
        nonce: 'abcde12345'
      })
      res.end(html, 'utf-8')
    } else {
      res.statusCode = 404
    }
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