const http = require('http')

const fab = require('./test/fab-dist/server/bundle.js')

http.createServer((req, res) => {
	fab.renderGet(req, res, {})
}).listen(3005)