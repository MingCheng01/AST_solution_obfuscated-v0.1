const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function If_obfuscated(js_code) {
    let ast_code = parse(js_code)

    visitor = {
        IfStatement(path) {
            let consequent_path = path.get('consequent');
            let alternate_path = path.get('alternate');
            let test_path = path.get('test');
            if (!types.isBlockStatement(consequent_path)) {
                consequent_path.replaceWith(types.blockStatement([consequent_path]));
            }

            if (alternate_path && !types.isBlockStatement(alternate_path)) {
                alternate_path.replaceWith(types.blockStatement([alternate_path]));
            }

            let replace_path;
            let {confident, value} = test_path.evaluate();
            if (!confident) {
                return;
            }
            if (value) {
                replace_path = consequent_path;
            } else {
                if (!alternate_path) {
                    path.remove();
                    path.scope.crawl();
                    return
                }
                replace_path = alternate_path;

            }
            for (let statement of replace_path.node.body) {
                if (types.isVariableDeclaration(statement) && statement.kind !== 'var') {
                    return;
                }
            }
            path.replaceWithMultiple(replace_path.node.body);
            path.scope.crawl();
        },
        ConditionalExpression(path) {
            let consequent_path = path.get('consequent');
            let alternate_path = path.get('alternate');
            let test_path = path.get('test');

            let {confident, value} = test_path.evaluate();
            if (!confident) {
                return;
            }

            if (value) {
                path.replaceWith(consequent_path);
            } else {
                path.replaceWith(alternate_path);
            }
            path.scope.crawl();
        }
    }

    traverse(ast_code, visitor);
    return generator(ast_code).code
}