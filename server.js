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

const handleRedirectToAssets = async (req, _, next) => {
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
  } else {
    return next()
  }
}

const handleFiles = async (req, _, next) => {
  if (files[req.pathname]) {
    const content = files[req.pathname]

    console.log({ content })
    const response = new Response(content.bytes, {
      status: 200,
      headers: content.headers,
    })
    console.log({ response })
    return response
  } else {
    return next()
  }
}

const handleHTML = async (req, settings, next) => {
  const pathname = req.pathname
  console.log(req.headers)
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
    const response = new Response(content, {
      status: 200,
      headers,
    })
    return response
  } else {
    return next()
  }
}

const handle404 = async () => {
  return new Response('Content not Found', {
    status: 404,
  })
}

const getRequestHandler = (handlers) => async (req, settings) => {
  let count = 0
  const handle = async () => {
    console.log({ count })
    return await handlers[count](req, settings, async () => {
      count++
      return await handle()
    })
  }
  return await handle()
}

const handler = getRequestHandler([
  handleRedirectToAssets,
  handleFiles,
  handleHTML,
  handle404,
])

const render = async (req, settings) => {
  console.log({ req, settings })
  try {
    req.pathname = getPath(req.url)
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
