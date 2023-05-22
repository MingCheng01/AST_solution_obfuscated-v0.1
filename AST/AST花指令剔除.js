const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function Flower_instructions1(js_code) {
    let ast_code = parse(js_code)

    function callToStr(path) {
        // 将对象进行替换
        var node = path.node;//获取路径节点
        if (!types.isObjectExpression(node.init))//不是对象表达式则退出
            return;
        var objPropertiesList = node.init.properties;    // 获取对象内所有属性
        if (objPropertiesList.length === 0) // 对象内属性列表为0则退出
            return;
        var objName = node.id.name;   // 对象名
        let scope = path.scope;//获取路径的作用域
        let binding = scope.getBinding(objName);//

        if (!binding || binding.constantViolations.length > 0) {//检查该变量的值是否被修改--一致性检测
            return;
        }
        let paths = binding.referencePaths;//绑定引用的路径
        let paths_sums = 0;//路径计数

        objPropertiesList.forEach(prop => {
            var key = prop.key.value;//属性名

            if (types.isFunctionExpression(prop.value))//属性值为函数表达式
            {
                var retStmt = prop.value.body.body[0];//定位到ReturnStatement

                path.scope.traverse(path.scope.block, {
                    CallExpression: function (_path) {//调用表达式匹配
                        let _path_binding = _path.scope.getBinding(objName);//当前作用域获取绑定
                        if (_path_binding !== binding) return;//两者绑定对比
                        if (!types.isMemberExpression(_path.node.callee))//成员表达式判定
                            return;
                        var _node = _path.node.callee;//回调函数节点
                        if (!types.isIdentifier(_node.object) || _node.object.name !== objName)//非标识符检测||节点对象名全等验证
                            return;
                        if (!(types.isStringLiteral(_node.property) || types.isIdentifier(_node.property)))//节点属性非可迭代字符验证||节点属性标识符验证
                            return;
                        if (!(_node.property.value === key || _node.property.name === key))//节点属性值与名称等于指定值验证
                            return;
                        if (!types.isStringLiteral(_node.property) || _node.property.value !== key)//节点属性可迭代字符验证与节点属性值与指定值等于验证
                            return;

                        var args = _path.node.arguments;//获取节点的参数

                        // 二元运算
                        if (types.isBinaryExpression(retStmt.argument) && args.length === 2)//二进制表达式判定且参数为两个
                        {
                            _path.replaceWith(types.binaryExpression(retStmt.argument.operator, args[0], args[1]));//二进制表达式替换当前节点
                        }
                        // 逻辑运算
                        else if (types.isLogicalExpression(retStmt.argument) && args.length === 2)//与二元运算一样
                        {
                            _path.replaceWith(types.logicalExpression(retStmt.argument.operator, args[0], args[1]));
                        }
                        // 函数调用
                        else if (types.isCallExpression(retStmt.argument) && types.isIdentifier(retStmt.argument.callee))//回调函数表达式判定及回调参数部分判定
                        {
                            _path.replaceWith(types.callExpression(args[0], args.slice(1)))
                        }
                        paths_sums += 1;//删除计数标志
                    }
                })
            } else if (types.isStringLiteral(prop.value)) {//属性值为可迭代字符类型
                var retStmt = prop.value.value;//属性值的值即A:B中的B部分
                path.scope.traverse(path.scope.block, {
                    MemberExpression: function (_path) {//成员表达式
                        let _path_binding = _path.scope.getBinding(objName);//当前作用域获取绑定
                        if (_path_binding !== binding) return;//两者绑定对比
                        var _node = _path.node;
                        if (!types.isIdentifier(_node.object) || _node.object.name !== objName)//节点对象标识符验证|节点对象名验证
                            return;
                        if (!(types.isStringLiteral(_node.property) || types.isIdentifier(_node.property)))//节点属性可迭代字符验证|标识符验证
                            return;
                        if (!(_node.property.value === key || _node.property.name === key))//节点属性值与名称等于指定值验证
                            return;
                        if (!types.isStringLiteral(_node.property) || _node.property.value !== key)//节点属性可迭代字符判定|节点属性值等于指定值验证
                            return;
                        _path.replaceWith(types.stringLiteral(retStmt))//节点替换
                        paths_sums += 1;//删除计数标志
                    }
                })
            }
        });
        if (paths_sums === paths.length) {//若绑定的每个路径都已处理 ，则移除当前路径
            path.remove();//删除路径
        }
    }

    traverse(ast_code, {VariableDeclarator: {exit: [callToStr]},});

    return generator(ast_code).code
}

function Flower_instructions2(js_code) {
    let ast_code = parse(js_code)

    visitor1 = {
        VariableDeclarator(path) {
            const {id} = path.node;
            let binding = path.scope.getBinding(id.name);

            if (binding.referenced) {
                return;
            }
            path.remove();
            path.scope.crawl();
        },
        FunctionDeclaration(path) {
            const {id} = path.node;
            // 防止函数中存在变量与函数名相同，且该变量在函数中使用，导致未去除未使用函数
            let binding = path.scope.parent.getBinding(id.name);

            if (binding.referenced) {
                return;
            }
            path.remove();
            // 手动更新 scope ，防止影响下个插件使用
            path.scope.crawl();
        }
    }

    traverse(ast_code, visitor1);


    return generator(ast_code).code
}

function Flower_instructions3(js_code) {
    let ast_code = parse(js_code)

    visitor2 = {
        UnaryExpression(path) {
            let {argument, operator} = path.node;
            if (!types.isCallExpression(argument) || operator !== '!') {
                return;
            }
            let {callee} = argument;
            if (!types.isFunctionExpression(callee)) {
                return;
            }
            let {id, params, body} = callee;
            // 注意，不能使用 path.node.argument.arguments 长度作为该自执行参数是否为无参类型判断
            // 因为自执行函数可以被强行传参（如示例还原前代码）
            if (id !== null || params.length > 0) {
                return;
            }
            path.replaceWithMultiple(body.body);
        }
    }

    traverse(ast_code, visitor2);


    return generator(ast_code).code
}

function Flower_instructions4(js_code) {
    let ast_code = parse(js_code)

    visitor3 = {
        FunctionDeclaration(path) {
            let func_str = path.toString();
            if (func_str.indexOf('random') !== -1 || func_str.indexOf('Date') !== -1 || (func_str.indexOf('try') !== -1 && func_str.indexOf('catch') !== -1)) {
                // 处理的函数参数固定时，函数结果必须唯一
                return;
            }
            // 将函数定义到本地
            eval(func_str);
            let {id} = path.node;
            let binding = path.scope.getBinding(id.name);
            for (let refer_path of binding.referencePaths) {
                // let call_path = refer_path.findParent(p => p.isCallExpression());
                let call_path = refer_path.parentPath;
                if (!types.isCallExpression(call_path)) {
                    continue;
                }
                let {arguments} = call_path.node;
                if (arguments.length === 0) {
                    break;
                }
                let break_flag = false;
                for (let arg of arguments) {
                    if (!types.isLiteral(arg)) {
                        // 只处理参数全为字面量的函数
                        break_flag = true;
                        break;
                    }
                }
                if (break_flag) {
                    break;
                }
                try {
                    // 防止函数执行出错导致程序报错，如函数中使用了全局变量肯定会报错（因为没把全局变量定义到本地）
                    let func_retrun = eval(call_path.toString());
                    if (func_retrun !== undefined) {
                        // 函数一般不会返回 undefined ，故排除此种情况
                        call_path.replaceWith(types.valueToNode(func_retrun));
                    }
                } catch (e) {
                }
                break;
            }
            // 手动更新 scope ，防止影响下个插件使用
            path.scope.crawl();
        }
    }

    traverse(ast_code, visitor3);

    return generator(ast_code).code
}





