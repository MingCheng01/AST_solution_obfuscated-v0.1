const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function Heavy_compression(js_code) {
    let ast_code = parse(js_code)
    js_code = generator(ast_code,
        opts = {
            retainLines: false,
            minfied: true,
            compact: true,
            comments: false
        }
    ).code
    return js_code
}