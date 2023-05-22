const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')


function Control_levelingControl_leveling1(js_code) {
    let ast_code = parse(js_code)

    function replace_While(path) {
        // 反控制流平坦化
        var node = path.node;
        // 判断是否是目标节点
        if (!(types.isBooleanLiteral(node.test) || types.isUnaryExpression(node.test)))
            // 如果while中不为true或!![]
            return;
        if (!(node.test.prefix || node.test.value))
            // 如果while中的值不为true
            return;
        if (!types.isBlockStatement(node.body))
            return;
        var body = node.body.body;
        if (!types.isSwitchStatement(body[0]) || !types.isMemberExpression(body[0].discriminant) || !types.isBreakStatement(body[1]))
            return;

        // 获取数组名及自增变量名
        var swithStm = body[0];
        var arrName = swithStm.discriminant.object.name;
        var argName = swithStm.discriminant.property.argument.name
        let arr = [];

        // 找到path节点的前一个兄弟节点，即数组所在的节点，然后获取数组
        let all_presibling = path.getAllPrevSiblings();
        // console.log(all_presibling)
        all_presibling.forEach(pre_path => {
            const {declarations} = pre_path.node;
            let {id, init} = declarations[0]
            if (arrName === id.name) {
                // 数组节点
                if (init.callee.object.value !== undefined) {
                    arr = init.callee.object.value.split('|');
                    pre_path.remove()
                }

            }
            if (argName === id.name) {
                // 自增变量节点
                pre_path.remove()
            }
        })

        // SwitchCase节点集合
        var caseList = swithStm.cases;
        // 存放按正确顺序取出的case节点
        var resultBody = [];
        arr.map(targetIdx => {
            var targetBody = caseList[targetIdx].consequent;
            // 删除ContinueStatement块(continue语句)
            if (t.isContinueStatement(targetBody[targetBody.length - 1]))
                targetBody.pop();
            resultBody = resultBody.concat(targetBody)
        });
        path.replaceInline(resultBody);
    }

    traverse(ast_code, {WhileStatement: {exit: [replace_While]}})

    return generator(ast_code).code
}

function Control_leveling2(js_code) {
    let ast_code = parse(js_code)

    visitor_for_switch = {
        ForStatement(path) {
            let {init, test, body} = path.node;
            if (!types.isVariableDeclaration(init) || !types.isBinaryExpression(test)) {
                return;
            }
            let declaration = init.declarations[0];

            const init_name = declaration.id.name;
            let init_value = declaration.init.value;
            let {left, operator, right} = test;

            if (!types.isIdentifier(left, {'name': init_name}) || operator !== '!==') {
                return;
            }
            let test_value = right.value;

            let switch_statement = body.body[0];
            if (!types.isSwitchStatement(switch_statement)) {
                return;
            }
            let {discriminant, cases} = switch_statement;
            if (!types.isIdentifier(discriminant, {'name': init_name})) {
                return;
            }
            // 存储 switch case 相关映射
            let case_map = {};
            // 存储最终代码语句节点
            let tmp_array = [];
            for (let c of cases) {
                let {consequent, test} = c, case_test_value;
                if (test) {
                    case_test_value = test.value;
                } else {
                    case_test_value = 'default_case';
                }
                case_map[case_test_value] = {'new_init_value': null, 'statement_array': []};
                for (let i of consequent) {
                    if (types.isContinueStatement(i)) {
                        continue;
                    }
                    if (types.isExpressionStatement(i) && types.isAssignmentExpression(i.expression)) {
                        let left_name = i.expression.left.name;
                        if (left_name !== init_name) {
                            continue;
                        }
                        case_map[case_test_value]['new_init_value'] = i.expression.right.value;
                        continue;
                    }
                    case_map[case_test_value]['statement_array'].push(i);
                }
            }

            while (true) {
                tmp_array = tmp_array.concat(case_map[init_value]['statement_array'])
                init_value = case_map[init_value]['new_init_value']

                if (init_value === test_value) {
                    break;
                }

                if (!case_map[init_value]) {
                    init_value = 'default_case';
                }
            }

            path.replaceWithMultiple(tmp_array);
        }
    }

    traverse(ast_code, visitor_for_switch);

    return generator(ast_code).code
}

function Control_leveling3(js_code) {
    let ast_code = parse(js_code)

    visitor_while_switch = {
        WhileStatement(path) {
            let {body} = path.node;
            let switch_statement = body.body[0];
            if (!types.isSwitchStatement(switch_statement)) {
                return;
            }
            let {discriminant, cases} = switch_statement;
            // 进一步进行特征判断
            if (!types.isMemberExpression(discriminant) || !types.isUpdateExpression(discriminant.property)) {
                return;
            }

            // 找到 array 是哪定义的，并且使用 path.evaluate() 方法获取其最终值
            let {confident, value} = path.scope.getBinding(discriminant.object.name).path.get('init').evaluate();

            if (!confident) {
                return;
            }
            let array = value, case_map = {}, tmp_array = [];

            for (let c of cases) {
                let {consequent, test} = c;
                let test_value;
                if (test) {
                    test_value = test.value;
                } else {
                    test_value = 'default_case';
                }
                let statement_array = [];
                for (let i of consequent) {
                    if (types.isContinueStatement(i)) {
                        continue;
                    }
                    statement_array.push(i);
                }
                case_map[test_value] = statement_array;
            }
            for (let i of array) {
                tmp_array = tmp_array.concat(case_map[i])
            }
            if (case_map.hasOwnProperty('default_case')) {
                tmp_array = tmp_array.concat(case_map['default_case'])
            }
            path.replaceWithMultiple(tmp_array);
            // 手动更新 scope ，防止影响下个插件使用
            path.scope.crawl();
        }
    }

    traverse(ast_code, visitor_while_switch);

    return generator(ast_code).code
}