const fs = require('fs')
const http = require('http')
const url_parse = require('url').parse
const vm = require('vm')
const mime = require('mime-types')
const fetch = require('node-fetch')
const path = require('path')

const dir = path.resolve(process.argv[2] || './test/fab-dist')
const file = `${dir}/server/bundle.js`
const src = fs.readFileSync(file)

const { Request } = fetch

const sandbox = {
  fetch: fetch,
  Request: fetch.Request,
  Response: fetch.Response,
  Headers: fetch.Headers,
  URL: URL,
  console: {
    log: console.log,
  },
  NODE_ENV: 'server',
  process: {
    env: {
      NODE_ENV: 'server',
    },
  },
}

const script = new vm.Script(src)
const exp = {}
const ctx = Object.assign({}, sandbox, { module: { exports: exp } })
const renderer = script.runInNewContext(ctx)
console.log({ renderer })

const getContentType = (pathname) => {
  const mimeType = mime.lookup(pathname)
  return mimeType ? mime.contentType(mimeType) : 'text/html; charset=utf-8'
}

const mapToObj = (map) => {
  return [...map.entries()].reduce(
    (obj, [key, value]) => ((obj[key] = value), obj),
    {}
  )
}

http
  .createServer(async (req, res) => {
    const pathname = url_parse(req.url).pathname
    if (pathname.startsWith('/_assets')) {
      fs.readFile(`${dir}${pathname}`, (err, data) => {
        res.setHeader('Content-Type', getContentType(pathname))
        res.end(data)
      })
    } else {
      const { method, headers } = req
      const url = `https://${req.headers.host}${req.url}`
      const fetch_req = new Request(url, {
        method,
        headers,
      })
      const fetch_res = await renderer.render(fetch_req, {
        injected: 'variables',
        should: 'work!',
      })
      console.log({ fetch_res })
      res.writeHead(
        fetch_res.status,
        fetch_res.statusText,
        mapToObj(fetch_res.headers)
      )
      const blob = await fetch_res.arrayBuffer()
      res.write(new Buffer(blob))
      res.end()
    }
  })
  .listen(3005)

console.log('ready')
