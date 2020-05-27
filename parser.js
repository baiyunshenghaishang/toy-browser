const { addCSSRules, computeCSS } = require('./css')
const { layout } = require('./layout')

let rules = [],
    currentToken = null,
    currentAttribute = null,
    currentTextNode = null,
    stack = [
        {
            type: 'document',
            children: [],
        },
    ]

const EOF = Symbol('EOF')

function emit(token) {
    let top = stack[stack.length - 1]
    if (token.type === 'startTag') {
        let el = {
            type: 'element',
            tagName: token.tagName,
            attributes: [],
            children: [],
        }

        top.children.push(el)
        stack.push(el)

        for (let key in token) {
            if (!['type', 'isSelfClosing', 'tagName'].includes(key)) {
                el.attributes.push({
                    name: key,
                    value: token[key],
                })
            }
        }
        computeCSS(stack, rules)
        if (token.isSelfClosing) {
            stack.pop()
        }

        currentTextNode = null
    } else if (token.type === 'endTag') {
        if (top.tagName != token.tagName) {
            throw new Error('标签不匹配', token.tagName)
        }
        if (token.tagName === 'style') {
            rules = addCSSRules(top.children[0].value)
        }
        layout(stack[stack.length - 1])
        stack.pop()
        currentTextNode = null
    } else if (token.type == 'text') {
        if (currentTextNode == null) {
            currentTextNode = {
                type: 'text',
                value: '',
            }
            top.children.push(currentTextNode)
        }
        currentTextNode.value += token.value
    }
}

function data(c) {
    if (c === '<') {
        return tagOpen
    } else if (c === EOF) {
        emit({
            type: 'EOF',
        })
        return
    } else {
        emit({
            type: 'text',
            value: c,
        })
        return data
    }
}

function tagOpen(c) {
    if (c === '/') {
        currentToken = {
            type: 'endTag',
            tagName: '',
        }
        return endTagOpen
    } else if (c.match(/[a-zA-Z]/)) {
        currentToken = {
            type: 'startTag',
            tagName: '',
        }
        return tagName(c)
    } else {
        return
    }
}

function endTagOpen(c) {
    if (c.match(/[a-zA-Z]/)) {
        return tagName(c)
    }
    return
}

function tagName(c) {
    if (c.match(/[\t\n\f ]/)) {
        return beforeAttributeName
    } else if (c === '/') {
        currentToken.isSelfClosing = true
        emit(currentToken)
        return selfClosingStartTag
    } else if (c === '>') {
        emit(currentToken)
        return data
    } else if (c.match(/[a-zA-Z]/)) {
        currentToken.tagName += c
        return tagName
    }
}

function selfClosingStartTag(c) {
    if (c === '>') {
        return data
    }
    return
}

function beforeAttributeName(c) {
    if (c.match(/[\t\n\f ]/)) {
        return beforeAttributeName
    } else if (c.match(/[a-zA-Z0-9]/)) {
        currentAttribute = {
            name: '',
            value: '',
        }
        return attributeName(c)
    } else if (c === '/' || c === '>') {
        return afterAttributeName(c)
    }
}

function attributeName(c) {
    if (c.match(/[\t\n\f ]/) || c === '/' || c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value
        return afterAttributeName(c)
    } else if (c === '=') {
        return beforeAttributeValue
    } else {
        currentAttribute.name += c
        return attributeName
    }
}

function afterAttributeName(c) {
    if (c.match(/[\t\n\f ]/)) {
        return afterAttributeName
    } else if (c === '/') {
        currentToken.isSelfClosing = true
        emit(currentToken)
        return selfClosingStartTag
    } else if (c === '=') {
        return beforeAttributeValue
    } else if (c === '>') {
        emit(currentToken)
        return data
    } else if (c.match(/[\t\n\f ]/)) {
        currentAttribute = {
            name: '',
            value: '',
        }
        return attributeName(c)
    }
}

function beforeAttributeValue(c) {
    if (c.match(/[\t\n\f ]/)) {
        return beforeAttributeValue
    } else if (c === "'") {
        return attributeValueSingleQuote
    } else if (c === '"') {
        return attributeValueDoubleQuote
    } else if (c.match(/[a-zA-Z0-9]/)) {
        return attributeValueUnquote(c)
    }
}

function attributeValueSingleQuote(c) {
    if (c === "'") {
        currentToken[currentAttribute.name] = currentAttribute.value
        return afterAttributeValue
    } else if (c.match(/[a-zA-Z0-9]/)) {
        currentAttribute.value += c
        return attributeValueSingleQuote
    }
}

function attributeValueDoubleQuote(c) {
    if (c === '"') {
        currentToken[currentAttribute.name] = currentAttribute.value
        return afterAttributeValue
    } else if (c.match(/[a-zA-Z0-9]/)) {
        currentAttribute.value += c
        return attributeValueDoubleQuote
    }
}

function attributeValueUnquote(c) {
    if (c.match(/[\t\n\f ]/)) {
        currentToken[currentAttribute.name] = currentAttribute.value
        return beforeAttributeName
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value
        emit(currentToken)
        return data
    } else if (c.match(/[a-zA-Z0-9]/)) {
        currentAttribute.value += c
        return attributeValueUnquote
    }
}

function afterAttributeValue(c) {
    if (c.match(/[\t\n\f ]/)) {
        return beforeAttributeName
    } else if (c === '/') {
        currentToken.isSelfClosing = true
        emit(currentToken)
        return selfClosingStartTag
    } else if (c === '>') {
        emit(currentToken)
        return data
    }
}

module.exports.parserHTML = function parseRHTML(html) {
    let state = data
    for (let c of html) {
        state = state(c)
    }
    state = state(EOF)
    return stack[0]
}
