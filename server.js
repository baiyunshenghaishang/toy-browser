const http = require('http')
const fs = require('fs')
const data = fs.readFileSync('./index.html')

const server = http.createServer((req, res) => {
    console.log('request received')
    console.log(req.headers)
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('X-Foo', 'bar')
    res.writeHead(200, { 'Content-type': 'text/plain' })
    res.end(data.toString())
})

server.listen(8080)
