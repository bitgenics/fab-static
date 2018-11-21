const HOUR_IN_SEC = 60 * 60

const default_config = {
  cacheRedirect: HOUR_IN_SEC,
  cacheStatic: HOUR_IN_SEC,
  staticDirName: 'static',
  redirectToAssets: true,
}

let custom_config = {}
try {
  custom_config = require('./fab.config.js')
} catch (e) {}
const config = Object.assign({}, default_config, custom_config)
console.log({ config })

const STATIC_DIR_PATH = `/${config.staticDirName}`

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

console.log({ files: Object.keys(files), htmls: Object.keys(htmls) })

const getPath = (url) => {
  let pathname = new URL(url).pathname
  if (pathname.endsWith('/')) {
    pathname += 'index.html'
  }
  return pathname
}

const getHtmlHeaders = async (req, settings) => {
  let headers = config.getHtmlHeaders && config.getHtmlHeaders(req, settings)
  if (headers && typeof headers.then == 'function') {
    headers = await headers
  }
  headers = headers || {}
  return headers instanceof Headers ? headers : new Headers(headers)
}

const handleRedirectToAssets = async (req) => {
  //console.log('handleRedirectToAssets')
  //console.log(STATIC_DIR_PATH)
  //console.log(req.pathname)
  if (config.redirectToAssets && req.pathname.startsWith(STATIC_DIR_PATH)) {
    console.log('redirecting!')
    const location = req.pathname.replace(STATIC_DIR_PATH, '/_assets')
    const headers = {
      'Cache-Control': `public, max-age=${config.cacheRedirect}`,
      Location: location,
    }
    return new Response('', {
      status: 302,
      headers,
    })
  }
}

const handleFiles = async (req) => {
  //console.log('handleFiles')
  if (files[req.pathname]) {
    const content = files[req.pathname]

    //console.log({ content })
    const response = new Response(content.bytes, {
      status: 200,
      headers: content.headers,
    })
    //console.log({ response })
    return response
  }
}

const handleHTML = async (req, settings) => {
  //console.log('handleHTML')
  const pathname = req.pathname
  //console.log(req.headers)
  const accepts_html = true //(req.headers.accept || '').match(/html/)
  // console.log({pathname, accepts_html})
  const html_handler = htmls[pathname]
    ? htmls[pathname]
    : accepts_html
      ? htmls['/_catch_all.html']
      : null

  if (html_handler) {
    const headers = await getHtmlHeaders(req, settings)
    headers.set('Content-Type', 'text/html; charset=utf-8')
    const data = {
      settings: JSON.stringify(settings),
      nonce: 'abcde12345',
    }
    const content = html_handler.renderToBuffer(data)
    return new Response(content, {
      status: 200,
      headers,
    })
  }
}

const handle404 = async () => {
  //console.log('handle404')
  return new Response('Content not Found', {
    status: 404,
  })
}

const getRequestHandler = (handlers) => async (req, settings) => {
  for (const handler of handlers) {
    const response = await handler(req, settings)
    if (typeof response !== 'undefined') return response
  }
}

const handler = getRequestHandler([
  handleRedirectToAssets,
  handleFiles,
  handleHTML,
  handle404,
])

const render = async (req, settings) => {
  //console.log({ req, settings })
  try {
    req.pathname = getPath(req.url)
    console.log(req.pathname)
    return await handler(req, settings)
  } catch (e) {
    console.log(e)
    return new Response('An Error occured', {
      status: 500,
      statusText: 'Internal Server Error',
    })
  }
}

module.exports = { render }
