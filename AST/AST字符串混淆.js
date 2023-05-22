const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function String_obfuscation(js_code) {
    let ast_code = parse(js_code)

    visitor = {
        StringLiteral(path) {
            delete path.node.extra
            let node = path.node;
            if (node.extra && /\\[ux]/gi.test(node.extra.raw)) {
                try {
                    node_value = decodeURIComponent(escape(node.value));
                } catch (error) {
                    node_value = node.value;
                }
                path.replaceWith(types.stringLiteral(node_value));
                path.node.extra = {'raw': JSON.stringify(node_value), 'rawValue': node_value};
            }
        },
        NumericLiteral(path) {
            let node = path.node;
            if (node.extra && /^0[obx]/i.test(node.extra.raw)) {
                node.extra = undefined;
            }
        }
    }

    traverse(ast_code, visitor)
    return generator(ast_code).code
}