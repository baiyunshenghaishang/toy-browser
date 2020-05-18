const css = require('css')

module.exports.addCSSRules = function addCSSRules(text) {
    let rules = []
    const ast = css.parse(text)
    rules.push(...ast.stylesheet.rules)
    return rules
}

function match(element, selector) {
    if (!element || !selector) {
        return false
    }
    if (selector[0] === '#') {
        let id = selector.slice(1),
            idAttr = element.attributes.find((attr) => attr.name === 'id')
        if (idAttr && idAttr.value === id) {
            return true
        }
    } else if (selector[0] === '.') {
        let cls = selector.slice(1),
            clsAttr = element.attributes.find((attr) => attr.name === 'class')
        if (clsAttr && clsAttr.value === cls) {
            return true
        }
    } else if (selector === element.tagName) {
        return true
    }
    return false
}

function specificity(selectors) {
    let sp = [0, 0, 0, 0]
    for (let selector of selectors) {
        if (selector[0] === '#') {
            sp[1] += 1
        } else if (selector[0] === '.') {
            sp[2] += 1
        } else {
            sp[3] += 1
        }
    }
    return sp
}

function compare(sp1, sp2) {
    if (sp1[0] - sp2[0]) {
        return sp1[0] > sp2[0]
    } else if (sp1[1] - sp2[1]) {
        return sp1[1] > sp2[1]
    } else if (sp1[2] - sp2[2]) {
        return sp1[2] > sp2[2]
    } else if (sp1[3] - sp2[3]) {
        return sp1[3] > sp2[3]
    }
    return true
}

module.exports.computeCSS = function computeCSS(stack, rules) {
    let elements = stack.slice().reverse()
    for (let rule of rules) {
        let selectors = rule.selectors[0].split(' ').reverse()
        if (!match(elements[0], selectors[0])) {
            continue
        }

        let j = 1
        for (let i = 1; i < elements.length; i++) {
            if (match(elements[i], selectors[j])) {
                j++
                if (j == selectors.length) break
            }
        }

        if (j >= selectors.length) {
            let element = elements[0]
            if (!element.computedStyle) element.computedStyle = {}
            let computedStyle = element.computedStyle,
                sp = specificity(selectors)
            for (let declaration of rule.declarations) {
                if (!computedStyle[declaration.property]) {
                    computedStyle[declaration.property] = {}
                }
                if (!computedStyle[declaration.property].sp || compare(sp, computedStyle[declaration.property].sp)) {
                    computedStyle[declaration.property].value = declaration.value
                    computedStyle[declaration.property].sp = sp
                }
            }
        }
    }
}
