const fs = require('fs')
const http = require('http')
const url_parse = require('url').parse
const mime = require('mime-types')
const path = require('path')

const dir = path.resolve(process.argv[2] || './test/fab-dist')

const fab = require(`${dir}/server/bundle.js`)

const getContentType = pathname => {
  const mimeType = mime.lookup(pathname)
  return mimeType ? mime.contentType(mimeType) : 'text/html; charset=utf-8'
}

http.createServer(async (req, res) => {
	const pathname = url_parse(req.url).pathname
	if(pathname.startsWith('/_assets')) {
		fs.readFile(`${dir}${pathname}`, (err, data) => {
			res.setHeader('Content-Type', getContentType(pathname))
			res.end(data)
		})
	} else {
		await fab.renderGet(req, res, {
			injected: 'variables',
			should: 'work!'
		})
	}
}).listen(3005)

console.log('ready')
