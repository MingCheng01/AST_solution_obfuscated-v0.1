const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function Parentheses_are_nested(js_code) {
    let ast_code = parse(js_code)
    visitor = {
        MemberExpression: {
            enter(path) {
            },
            exit(path) {
                if (path.node.computed && path.node.property.type === 'StringLiteral') {
                    path.node.computed = false;
                    path.node.property.type = 'Identifier';
                    path.node.property.name = path.node.property.value;
                    delete path.node.property.extra;
                }
            }

        }
    }
    traverse(ast_code, visitor)
    return generator(ast_code).code
}