const fs = require('fs');
var util = require('util');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const types = require('@babel/types');
const generator = require('@babel/generator').default;

const {
    is_literal, visual_literal, visual_var_literal, to_dot_form, rm_unused_code,
    rm_unused_branch, simple_calc, multiple_define
} = require('./AST轮子types');

// 程序启动时间
var time_start = new Date().getTime()

let jscode = fs.readFileSync('D:\\Project\\Python\\pythonProject\\2023\\2\\1.js', {encoding: 'utf-8'});
// 转换为 ast 树
let ast = parser.parse(jscode);


//调用插件，处理待处理 js ast 树
traverse(ast, visual_literal);
traverse(ast, visual_var_literal);
traverse(ast, simple_calc);
traverse(ast, multiple_define);

const ob_replace_call_expression = {
    VariableDeclarator(path) {
        let {scope, node} = path;
        let {id, init} = node;
        // 解密函数名称
        let decode_func_name;
        if (!types.isArrayExpression(init)) {
            return;
        }
        for (let element of init.elements) {
            if (!is_literal(element)) {
                return;
            }
        }
        let binding = scope.getBinding(id.name);
        if (binding.referencePaths.length < 2) {
            return;
        }
        let eval_str = path.parentPath.toString();
        // 解密函数位置
        let func_start, func_end, tmp_array = [];
        for (let refer_path of binding.referencePaths) {
            let parent_path = refer_path.findParent(p => p.isCallExpression()) || refer_path.findParent(p => p.isFunctionDeclaration())
            if (!parent_path) {
                return;
            }
            if (parent_path.isFunctionDeclaration()) {
                func_start = parent_path.node.start;
                func_end = parent_path.node.end;
                decode_func_name = parent_path.node.id.name;
            } else {
                parent_path = parent_path.parentPath;
                if (!types.isExpressionStatement(parent_path)) {
                    return;
                }
            }
            eval_str += '\n' + parent_path.toString()
            tmp_array.push(parent_path);
        }

        let eval_str_ast = parser.parse(eval_str);
        // 防止检测代码格式化
        eval_str = generator(eval_str_ast, {'compact': true}).code;
        // 执行自执行函数更新数组，将解密函数定义到本地环境
        eval(eval_str);

        let remove_flag = true;
        _binding = scope.getBinding(decode_func_name);
        for (let refer_path of _binding.referencePaths) {

            let parent_path = refer_path.findParent(p => p.isCallExpression())
            if (!parent_path) {
                continue
            }
            if (decode_func_name !== parent_path.node.callee.name) {
                continue;
            }
            let parent_start = parent_path.node.start;
            let parent_end = parent_path.node.end;
            if (parent_start >= func_start && parent_end <= func_end) {
                continue;
            }

            try {
                let call_return = eval(parent_path.toString());
                console.log(parent_path.toString() + ' => ' + call_return);
                parent_path.replaceWith(types.valueToNode(call_return));
            } catch (e) {
                remove_flag = false;
                console.log(parent_path.toString() + ' => do nothing');
            }
        }
        if (remove_flag) {
            for (let tmp_path of tmp_array) {
                tmp_path.remove();
            }
        }
        path.remove();
        scope.crawl();
    }
}
traverse(ast, ob_replace_call_expression);
traverse(ast, simple_calc);

/* 还原 ob 混淆中的 ObjectExpression 节点 */
const ob_replace_obj_expression =
    {
        VariableDeclarator(path) {
            let {id, init} = path.node;
            if (!types.isObjectExpression(init)) {
                return;
            }
            let {properties} = init;
            if (properties.length <= 0) {
                return;
            }
            let obj_map = {};
            for (let property of properties) {
                let {key, value} = property;
                key = key.value;
                if (types.isFunctionExpression(value)) {
                    let {body} = value;
                    if (body.body.length !== 1 || !types.isReturnStatement(body.body[0])) {
                        return;
                    }
                } else if (types.isStringLiteral(value)) {
                    value = value.value;
                } else {
                    return;
                }
                obj_map[key] = value;
            }

            let binding = path.scope.getBinding(id.name);
            let remove_flag = true;
            for (let refer_path of binding.referencePaths.reverse()) {

                let parent_path = refer_path.parentPath;
                let key = parent_path.node.property.value;

                let value = obj_map[key];
                if (types.isFunctionExpression(value)) {
                    let grandparent_path = parent_path.parentPath;
                    if (!types.isCallExpression(grandparent_path)) {
                        continue;
                    }

                    let {arguments} = grandparent_path.node;

                    let {params} = value;
                    if (arguments.length !== params.length) {
                        return;
                    }
                    var arguments_map = {};
                    let break_flag = false;


                    for (let i = 0; i < arguments.length; i++) {
                        arguments_map[params[i].name] = arguments[i];

                        // 防止实参数大于形参数
                        if (!arguments[i]) {
                            break_flag = true;
                            break;
                        }
                    }

                    if (break_flag) {
                        remove_flag = false;
                        continue;
                    }

                    let return_statement = JSON.parse(JSON.stringify(value.body.body[0].argument));
                    let new_jscode = generator(return_statement, {'compact': true}).code;
                    let new_ast = parser.parse(new_jscode);

                    traverse(new_ast, {
                        Identifier(_path) {

                            let {name} = _path.node;
                            if (!arguments_map.hasOwnProperty(name)) {
                                return;
                            }
                            _path.replaceWith(arguments_map[name])
                        }
                    })
                    let old_code = grandparent_path.toString();
                    grandparent_path.replaceWithMultiple(new_ast.program.body);
                    console.log(old_code + ' => ' + grandparent_path.toString());
                } else {
                    console.log(parent_path.toString() + ' => ' + value);
                    parent_path.replaceWith(types.valueToNode(value));
                }
            }

            if (remove_flag) {
                path.remove();
            }
            // 手动更新 scope ，防止影响下个插件使用
            path.scope.crawl();
        }
    }

traverse(ast, ob_replace_obj_expression);


const ob_replace_while_switch_control_flow =
    {
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
            path.scope.crawl();
        }
    }

traverse(ast, to_dot_form);
traverse(ast, ob_replace_while_switch_control_flow);

traverse(ast, simple_calc);
traverse(ast, rm_unused_branch);

console.log('AST traverse completed.')

// 生成处理后的 js
let {code} = generator(ast);
console.log('AST generator completed.')
fs.writeFile('out.js', code, (err) => {
});

// 程序结束时间
var time_end = new Date().getTime()
console.log(util.format('The program runs to completion, time-consuming: %s s', (time_end - time_start) / 1000))