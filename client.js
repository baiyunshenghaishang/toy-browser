const net = require('net')

class Request {
    // method, url = host + port + path
    // body
    // headers
    constructor(options) {
        this.method = options.method || 'GET'
        this.host = options.host
        this.port = options.port || '80'
        this.path = options.path || '/'
        this.body = options.body || {}
        this.headers = options.headers || {}
        if (!this.headers['Content-Type']) {
            this.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        }

        if (this.headers['Content-Type'] === 'application/json') {
            this.bodyText = JSON.stringify(this.body)
        } else if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
            this.bodyText = Object.keys(this.body)
                .map((key) => `${key}=${encodeURIComponent(this.body[key])}`)
                .join('&')
        }
        this.headers['Content-Length'] = this.bodyText.length
    }

    toString() {
        return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers)
    .map((key) => `${key}: ${this.headers[key]}`)
    .join('\r\n')}
\r
${this.bodyText}`
    }

    open(method, url) {}

    send(connection) {
        return new Promise((resolve, reject) => {
            if (connection) {
                connection.write(this.toString())
            } else {
                connection = net.createConnection(
                    {
                        host: this.host,
                        port: this.port,
                    },
                    () => {
                        connection.write(this.toString())
                    }
                )
            }
            const parser = new ResponseParser()
            connection.on('data', (data) => {
                parser.receive(data.toString())
                // resolve(data.toString())
                if (parser.isFinished) {
                    resolve(parser.response)
                }
                connection.end()
            })
            connection.on('error', (error) => {
                reject(error)
                client.end()
            })
        })
    }
}

class Response {}

class ResponseParser {
    constructor() {
        this.WAITING_STATUS_LINE = 0
        this.WAITING_STATUS_LINE_END = 1
        this.WAITING_HEADER_NAME = 2
        this.WAITING_HEADER_SPACE = 3
        this.WAITING_HEADER_VALUE = 4
        this.WAITING_HEADER_LINE_END = 5
        this.WAITING_HEADER_BLOCK_END = 6
        this.WAITING_BODY = 7

        this.current = this.WAITING_STATUS_LINE
        this.statusLine = ''
        this.headers = {}
        this.headerName = ''
        this.headerValue = ''
    }

    get isFinished() {
        return this.bodyParser && this.bodyParser.isFinished
    }

    get response() {
        this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/)
        return {
            statusCode: RegExp.$1,
            statusText: RegExp.$2,
            headers: this.headers,
            body: this.bodyParser ? this.bodyParser.content.join('') : '',
        }
    }

    receive(string) {
        for (let character of string) {
            this.receiveChar(character)
        }
    }

    receiveChar(char) {
        if (this.current === this.WAITING_STATUS_LINE) {
            if (char === '\r') {
                this.current = this.WAITING_STATUS_LINE_END
            } else if (char === '\n') {
                this.current = this.WAITING_HEADER_NAME
            } else {
                this.statusLine += char
            }
        } else if (this.current === this.WAITING_STATUS_LINE_END) {
            if (char === '\n') {
                this.current = this.WAITING_HEADER_NAME
            }
        } else if (this.current === this.WAITING_HEADER_NAME) {
            if (char === ':') {
                this.current = this.WAITING_HEADER_SPACE
            } else if (char === '\r') {
                this.current = this.WAITING_HEADER_BLOCK_END
            } else {
                this.headerName += char
            }
        } else if (this.current === this.WAITING_HEADER_SPACE) {
            if (char === ' ') {
                this.current = this.WAITING_HEADER_VALUE
            }
        } else if (this.current === this.WAITING_HEADER_VALUE) {
            if (char === '\r') {
                this.current = this.WAITING_HEADER_LINE_END
                this.headers[this.headerName] = this.headerValue
                this.headerName = ''
                this.headerValue = ''
            } else {
                this.headerValue += char
            }
        } else if (this.current === this.WAITING_HEADER_LINE_END) {
            if (char === '\n') {
                this.current = this.WAITING_HEADER_NAME
            }
        } else if (this.current === this.WAITING_HEADER_BLOCK_END) {
            if (char === '\n') {
                this.current = this.WAITING_BODY
                if (this.headers['Transfer-Encoding'] === 'chunked') {
                    this.bodyParser = new ChunkedBodyParser()
                }
            }
        } else if (this.current === this.WAITING_BODY) {
            this.bodyParser.receiveChar(char)
        }
    }
}

class ChunkedBodyParser {
    constructor() {
        this.WAITING_LENGTH = 0
        this.WAITING_LENGTH_LINE_END = 1
        this.READING_CHUNK = 2
        this.WAITING_NEW_LINE = 3
        this.WAITING_NEW_LINE_END = 4
        this.length = 0
        this.content = []
        this.current = this.WAITING_LENGTH
    }
    receiveChar(char) {
        if (this.current === this.WAITING_LENGTH) {
            if (char === '\r') {
                this.current = this.WAITING_LENGTH_LINE_END
                if (this.length === 0) {
                    this.isFinished = true
                }
            } else {
                this.length *= 10
                this.length += char.charCodeAt(0) - '0'.charCodeAt(0)
            }
        } else if (this.current === this.WAITING_LENGTH_LINE_END) {
            if (char === '\n') {
                this.current = this.READING_CHUNK
            }
        } else if (this.current === this.READING_CHUNK) {
            this.content.push(char)
            this.length--
            if (this.length == 0) {
                this.current = this.WAITING_NEW_LINE
            }
        } else if (this.current === this.WAITING_NEW_LINE) {
            if (char === '\r') {
                this.current = this.WAITING_NEW_LINE_END
            }
        } else if (this.current === this.WAITING_NEW_LINE_END) {
            if (char === '\n') {
                this.current = this.WAITING_LENGTH
            }
        }
    }
}

void (async function () {
    let request = new Request({
        method: 'POST',
        host: '127.0.0.1',
        port: '8080',
        path: '/',
        headers: {
            'X-Foo2': 'customed',
        },
        body: {
            name: 'huangzhen',
        },
    })
    let response = await request.send()
    console.log(response)
})()

// const client = net.createConnection({ host: '127.0.0.1', port: 8080 }, () => {
//     // 'connect' 监听器
//     console.log('已连接到服务器')
//     let request = new Request({
//         method: 'POST',
//         host: '127.0.0.1',
//         port: '8080',
//         path: '/',
//         headers: {
//             'X-Foo2': 'customed',
//         },
//         body: {
//             name: 'huangzhen',
//         },
//     })
//     console.log(request.toString())
//     client.write(request.toString())
// })
// client.on('data', (data) => {
//     console.log('receive data')
//     console.log(data.toString())
//     client.end()
// })
// client.on('error', (error) => {
//     console.log('error')
//     console.log(error.toString())
//     client.end()
// })
// client.on('end', () => {
//     console.log('已从服务器断开')
// })
