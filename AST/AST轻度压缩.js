const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function Mild_compression(js_code) {
    let ast_code = parse(js_code)
    js_code = generator(ast_code,
        opts = {
            retainLines: true,
            minfied: false,
            compact: false,
            comments: true
        }
    ).code
    return js_code
}