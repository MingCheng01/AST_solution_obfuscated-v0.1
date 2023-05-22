const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function String_concatenation(js_code) {
    let ast_code = parse(js_code)
    visitor = {
        //拼接字符串变量名
        BinaryExpression(path) {
            if (path.node.left.type === 'StringLiteral' && path.node.right.type === 'StringLiteral' && path.node.operator === '+') {
                path.replaceInline(types.valueToNode(path.node.left.value + path.node.right.value))
            }
        }
    }
    traverse(ast_code, visitor)
    return generator(ast_code).code
}

