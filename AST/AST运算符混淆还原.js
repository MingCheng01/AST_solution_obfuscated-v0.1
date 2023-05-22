const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function Operator_confusion(js_code) {
    let ast_code = parse(js_code)
    visitor = {
        'BinaryExpression'(path) {
            let has_identifier_in_binary = check_identifier_in_binary(path.node)
            if (!has_identifier_in_binary) {
                let binary_result = eval(generator(path.node).code)
                path.replaceWith(types.valueToNode(binary_result))
            }
        }
    }

    // 检查运算符内是否有参数
    function check_identifier_in_binary(node) {
        if (types.isBinaryExpression(node)) {
            let left = check_identifier_in_binary(node.left)
            let right = check_identifier_in_binary(node.right)
            return left || right
        } else if (types.isStringLiteral(node) || types.isNumericLiteral(node) || types.isUnaryExpression(node)) {
            return false
        }
        return true
    }

    traverse(ast_code, visitor)
    return generator(ast_code).code
}