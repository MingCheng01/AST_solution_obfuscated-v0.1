const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function Remove_comma(js_code) {
    let ast_code = parse(js_code)

    visitor = {
        VariableDeclaration(path) {
            const {kind, declarations} = path.node;

            // 必须要加此处判断，不然会死循环，因为我们在下面的操作也生成了 VariableDeclaration
            if (declarations.length <= 1) {
                return;
            }

            let tmp_array = [];
            for (let variable_declarator of declarations) {
                tmp_array.push(types.VariableDeclaration(kind, [variable_declarator]));
            }

            path.replaceWithMultiple(tmp_array);
        }
    }

    traverse(ast_code, visitor)
    return generator(ast_code).code
}
