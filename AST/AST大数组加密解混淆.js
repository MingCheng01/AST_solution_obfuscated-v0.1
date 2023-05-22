const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')

function Large_array_encryption(js_code) {

    let ast_code = parse(js_code)

    //解密三部分的代码执行
    let end = 3;//切片需要处理的代码块
    let newAst = parse('');//新建ast
    decrypt_code = ast_code.program.body.slice(0, end);//切片
    newAst.program.body = decrypt_code// 将前3个节点替换进新建ast

    //避免内存爆破，对所有的正则检测均以true返回
    newAst = parse(generator(newAst).code);//刷新ast
    traverse(newAst, {NewExpression: {exit: [RegExpTrue]},});

    newAst = parse(generator(newAst).code);//刷新ast
    let stringDecryptFunc = generator(newAst, {compact: true},).code;//转为js，由于存在格式化检测，需要指定选项，来压缩代码// 自动转义

    eval(stringDecryptFunc);//执行三部分的代码


    //准备工作及对解密三部分节点删除
    let stringDecryptFuncAst = ast_code.program.body[end - 1];// 拿到解密函数所在的节点
    let DecryptFuncName;
    try {
        DecryptFuncName = stringDecryptFuncAst.declarations[0].id.name;//拿到解密函数的名字
        console.log('解密函数为：', DecryptFuncName);
    } catch (e) {
        DecryptFuncName = stringDecryptFuncAst.id.name;//拿到解密函数的名字
    }


    rest_code = ast_code.program.body.slice(end); // 剩下的节点
    ast_code.program.body = rest_code;//剩下的节点替换


    //加密数组还原
    traverse(ast_code, {
        CallExpression(path) {//回调表达式匹配--替换加密数组为对应的值
            if (types.isIdentifier(path.node.callee, {name: DecryptFuncName})) {       //当变量名与解密函数名相同时，就执行相应操作

                try {
                    console.log(eval(path.toString()))
                    path.replaceWith(types.valueToNode(eval(path.toString())));      // 值替换节点
                } catch (e) {
                    console.log(e);
                }

            }
        },
    });
    // traverse(ast, {MemberExpression: {exit: [add_Mem_str]},});  // 成员表达式字符串合并

    return generator(ast_code).code
}


//解密大数组-辅助函数，对所有的正则检测，均以true返回
function RegExpTrue(path) {


    let node = path.node;
    if (!types.isIdentifier(node.callee)) return;//不是标识符则退出
    if (node.callee.name !== 'RegExp') return; //不是指定值则退出
    if (!types.isVariableDeclarator(path.parentPath)) return;//不是指定类型则退出
    if (!types.isVariableDeclaration(path.parentPath.parentPath)) return;//不是指定类型则退出
    if (!types.isBlockStatement(path.parentPath.parentPath.parentPath)) return;//不是指定类型则退出
    let parent_node = path.parentPath.parentPath.parentPath.node;
    let body_num = parent_node.body.length
    if (body_num <= 1) return;//如果数量小于指定数量，则退出
    if (!types.isReturnStatement(parent_node.body[body_num - 1])) return;//不是指定类型则退出
    parent_node.body[body_num - 1].argument = types.BooleanLiteral(true);//替换为true


}


// 成员表达式字符串合并
function add_Mem_str(path) {
    let node = path.node;
    if (node.computed && types.isBinaryExpression(node.property) && node.property.operator == '+') {
        let BinNode = node.property;//属性节点
        let tmpast = parse.parse(generator(BinNode).code);
        let addstr = '';
        traverse(tmpast, {
            BinaryExpression: {
                exit: function (_p) {
                    if (types.isStringLiteral(_p.node.right) && types.isStringLiteral(_p.node.left)) {//二进制表达式左右有一个类型为字符型
                        _p.replaceWith(types.StringLiteral(eval(generator(_p.node).code)))      // 值替换节点
                    }
                    addstr = _p.toString();
                }

            }
        })
        node.property = types.Identifier(addstr);
    }
}