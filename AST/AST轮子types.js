const types = require('@babel/types');

/* 判断节点是否为字面量 */
function is_literal(node) {
    if (types.isLiteral(node)) {
        return true;
    }
    else if (types.isUnaryExpression(node, { 'operator': '+' }) || types.isUnaryExpression(node, { 'operator': '-' })) {
        return is_literal(node.argument);
    }
    return false
}

/* 还原不直观的编码字符串或数值 */
const visual_literal =
{
    NumericLiteral(path) {
        let node = path.node;
        if (node.extra && /^0[obx]/i.test(node.extra.raw)) {
            node.extra = undefined;
        }
    },
    StringLiteral(path) {
        let node = path.node;
        if (node.extra && /\\[ux]/gi.test(node.extra.raw)) {
            try {
                node_value = decodeURIComponent(escape(node.value));
            } catch (error) {
                node_value = node.value;
            };
            path.replaceWith(types.stringLiteral(node_value));
            path.node.extra = { 'raw': JSON.stringify(node_value), 'rawValue': node_value };
        }
    }
}

/* 替换、还原由 var,let,const 定义的未变更的字面量 */
const visual_var_literal =
{
    VariableDeclarator(path) {
        const { id, init } = path.node;
        let binding = path.scope.getBinding(id.name);

        // 只处理字面量，且被修改则不作处理
        if (!types.isLiteral(init) || !binding.constant) {
            return;
        }
        for (let refer_path of binding.referencePaths) {
            refer_path.replaceWith(init);
        }
        path.remove();
        // 手动更新 scope ，防止影响下个插件使用
        path.scope.crawl();
    }
}


/*
 计算![]、!![] 和 简单的字面量计算如 1+2+3
 刚插件需使用 exit 方式遍历
 */
const simple_calc = {
    UnaryExpression: {
        exit(path) {
            let old_code = path.toString();
            let allow_array = ['!', 'typeof']
            let { operator } = path.node;
            if (!allow_array.includes(operator)) {
                return;
            }
            let { confident, value } = path.evaluate();
            if (!confident) {
                return;
            }
            path.replaceWith(types.valueToNode(value));
            console.log(old_code + ' => ' + path.toString());
            path.scope.crawl();
        }
    },
    BinaryExpression: {
        exit(path) {
            let old_code = path.toString();
            let invalid_identifier_array = ['undefined', 'Infinity', 'NaN'];
            let { left, right } = path.node;
            if (!types.isLiteral(left) && !types.isUnaryExpression(left)) {
                if (types.isIdentifier(left) || invalid_identifier_array.includes(left.name)) {
                }
                else if (types.isCallExpression(left) && global[left.callee.name]) {
                }
                else {
                    return;
                }
            }
            if (!types.isLiteral(right) && !types.isUnaryExpression(right)) {
                if (types.isIdentifier(right) || invalid_identifier_array.includes(right.name)) {
                }
                else if (types.isCallExpression(right) && global[right.callee.name]) {
                }
                else {
                    return;
                }
            }

            let { confident, value } = path.evaluate();
            if (!confident) {
                return;
            }
            let invalid_value_array = [undefined, null, Infinity, -Infinity, NaN];
            if (invalid_value_array.includes(value)) {
                path.replaceWithSourceString(value);
                console.log(old_code + ' => ' + path.toString());
            }
            else {
                path.replaceWith(types.valueToNode(value));
                if (path.isStringLiteral()){
                    path.node.extra = { 'raw': JSON.stringify(value), 'rawValue': value };
                }
                console.log(old_code + ' => ' + path.toString());
            }
            path.scope.crawl();
        }
    }
}

/* 处理套娃式声明语句，如 var a=b(function xxx);var c=b;... */
const multiple_define =
{
    VariableDeclarator(path) {
        let { id, init } = path.node;
        if (!types.isIdentifier(id) || !types.isIdentifier(init)) {
            return;
        }
        let init_identifier = path.scope.getBinding(init.name).identifier;
        let id_refer_paths = path.scope.getBinding(id.name).referencePaths;
        for (let refer_path of id_refer_paths) {
            refer_path.replaceWith(init_identifier);
        }
        path.remove();
        // 手动更新 scope ，防止影响下个插件使用
        path.scope.crawl();
    }
}

/* 将 a['bb'] 转换为 a.bb */
const to_dot_form = {
    MemberExpression(path) {
        let { computed } = path.node;
        // 获取 path property 子路径
        let property = path.get('property');
        if (computed && types.isStringLiteral(property)) {
            property.replaceWith(types.identifier(property.node.value));
            path.node.computed = false;
        }
        path.scope.crawl();
    }
}

/* 删除条件确定的 if 判断或条件表达式的未使用的分支代码 */
const rm_unused_branch =
{
    IfStatement(path) {
        let consequent_path = path.get('consequent');
        let alternate_path = path.get('alternate');
        let test_path = path.get('test');
        if (!types.isBlockStatement(consequent_path)) {
            consequent_path.replaceWith(types.blockStatement([consequent_path]));
        }

        if (alternate_path.toString() && !types.isBlockStatement(alternate_path)) {
            alternate_path.replaceWith(types.blockStatement([alternate_path]));
        }

        let replace_path;
        let { confident, value } = test_path.evaluate();
        if (!confident) {
            return;
        }
        if (value) {
            replace_path = consequent_path;
        }
        else {
            if (!alternate_path.toString()) {
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

        let { confident, value } = test_path.evaluate();
        if (!confident) {
            return;
        }

        if (value) {
            path.replaceWith(consequent_path);
        }
        else {
            path.replaceWith(alternate_path);
        }
        path.scope.crawl();
    }
}

/*  删除未被使用的 function 和由 var,let,const 定义的未使用变量、空语句 */
const rm_unused_code =
{
    VariableDeclarator(path) {
        const { id } = path.node;
        let binding = path.scope.getBinding(id.name);

        if (binding.referenced) {
            return;
        }
        path.remove();
        path.scope.crawl();
    },
    FunctionDeclaration(path) {
        const { id } = path.node;
        // 防止函数中存在变量与函数名相同，且该变量在函数中使用，导致未去除未使用函数
        let binding = path.scope.parent.getBinding(id.name);

        if (binding.referenced) {
            return;
        }
        path.remove();
        // 手动更新 scope ，防止影响下个插件使用
        path.scope.crawl();
    },
    'EmptyStatement'(path) {
        path.remove();
    }
}

exports.is_literal = is_literal;
exports.visual_literal = visual_literal;
exports.visual_var_literal = visual_var_literal;
exports.to_dot_form = to_dot_form;
exports.rm_unused_branch = rm_unused_branch;
exports.rm_unused_code = rm_unused_code;
exports.simple_calc = simple_calc;
exports.multiple_define = multiple_define;