const {parse} = require('@babel/parser')
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const types = require('@babel/types')
const fs = require('fs')

const js_code = fs.readFileSync('AST_6_data.js', {
    encoding: 'utf-8'
});

let ast_code = parse(js_code)


//function a是用来将加密函数压入内存后执行
//如果js中没有用到大数组的加密方式，无需调用
function a() {
    //拿到解密函数节点
    let stringDecryptFuncAst = ast_code.program.body[2];
    //拿到解密函数名字
    let DecryptFuncName = stringDecryptFuncAst.declarations[0].id.name;
    console.log('解密函数：', DecryptFuncName);
    //新建一个AST，把还原代码中的前三部分加入到body节点中
    let newAst = parse('')
    newAst.program.body.push(ast_code.program.body[0]);
    newAst.program.body.push(ast_code.program.body[1]);
    newAst.program.body.push(stringDecryptFuncAst);

    //将上方压入的三部分代码转为字符串，由于存在格式化检测，需要指定选项来压缩代码
    let stringDecryptFunc = generator(newAst, {compact: true}).code;
    //将字符串形式的代码执行，这样就可以在nodejs中运行解密函数
    eval(stringDecryptFunc)

    visitor1 = {
        //遍历所有变量
        VariableDeclarator(path) {
            //当变量名与解密函数名相同时，执行
            if (path.node.id.name === DecryptFuncName) {
                let binding = path.scope.getBinding(DecryptFuncName);
                binding && binding.referencePaths.map(function (v) {
                    v.parentPath.isCallExpression() &&
                    v.parentPath.replaceWith(types.stringLiteral(
                        eval(v.parentPath + '')
                    ))
                })
            }
        }
    }
    traverse(ast_code, visitor1)

    //弹出
    ast_code.program.body.shift();
    ast_code.program.body.shift();
    ast_code.program.body.shift();
}

a()

visitor2 = {
    StringLiteral(path) {
        delete path.node.extra
    }
}
traverse(ast_code, visitor2)

var totalObj = {};

function generatorObj(ast_code) {
    visitor3 = {
        VariableDeclarator(path) {
            //init节点为ObjectExperssion时,就是需要处理的对象
            if (types.isObjectExpression(path.node.init)) {
                //取出对象名
                let objName = path.node.id.name;
                //以对象名为属性在totalObj中创建对象
                objName && (totalObj[objName] = totalObj[objName] || {});
                //解析对象中每一个属性，加入到新建的对象中，注意属性值依旧是Node类型
                totalObj[objName] && path.node.init.properties.map(
                    function (p) {
                        totalObj[objName][p.key.value] = p.value;
                    }
                );
            }
        }
    };
    traverse(ast_code, visitor3)
    return ast_code
}

ast_code = generatorObj(ast_code)

visitor4 = {
    BinaryExpression: {
        enter(path) {
        },
        exit(path) {
            if (path.node.left.type === 'StringLiteral' && path.node.right.type === 'StringLiteral' && path.node.operator === '+') {
                path.replaceInline(types.valueToNode(path.node.left.value + path.node.right.value))
            }
        }
    }
}
traverse(ast_code, visitor4)

function findRealValue(node) {
    if (types.isMemberExpression(node)) {
        let objName = node.object.name;
        let propName = node.property.value;
        if (totalObj[objName][propName]) {
            return findRealValue(totalObj[objName][propName]);
        } else {
            return false
        }
    } else {
        return node
    }
}

visitor5 = {
    VariableDeclarator(path) {
        if (types.isObjectExpression(path.node.init)) {
            console.log(path.node.init);
            path.node.init.properties.map(function (p) {
                let realNode = findRealValue(p.value);
                realNode && (p.value = realNode);
            });
        }
    }
}
traverse(ast_code, visitor5)

ast_code = generatorObj(ast_code)

visitor6 = {
    MemberExpression(path) {
        let objName = path.node.object.name;
        let propName = path.node.property.value;
        totalObj[objName] && types.isStringLiteral(totalObj[objName][propName]) &&
        path.replaceWith(totalObj[objName][propName]);
    }
}
traverse(ast_code, visitor6)

function findRealFunc(node) {
    if (types.isFunctionExpression(node) && node.body.body.length === 1) {
        let expr = node.body.body[0].argument.callee;
        if (types.isMemberExpression(expr)) {
            let objName = expr.object.name;
            let propName = expr.property.value;
            if (totalObj[objName]) {
                return findRealFunc(totalObj[objName][propName])
            } else {
                return false
            }
        } else {
            return node;
        }
    } else {
        return node
    }
}

visitor7 = {
    VariableDeclarator(path) {
        if (types.isObjectExpression(path.node.init)) {
            path.node.init.properties.map(function (p) {
                let realNode = findRealFunc(p.value);
                realNode && (p.value = realNode);
            });
        }
    }
}

traverse(ast_code, visitor7)
ast_code = generatorObj(ast_code)

visitor8 = {
    CallExpression(path) {
        if (!types.isMemberExpression(path.node.callee)) return '';
        let objName = path.node.callee.object.name;
        let propertyName = path.node.callee.property.value;
        if (totalObj[objName] && totalObj[objName][propertyName]) {
            let myFunc = totalObj[objName][propertyName];
            let returnExpr = myFunc.body.body[0].argument;
            if (types.isMemberExpression(returnExpr)) {
                let binExper = types.binaryExperession(returnExpr.operator, path.node.arguments[0], path.node.arguments[1]);
                path.replaceWith(binExper)
            } else if (types.isCallExpression(returnExpr)) {
                let newArray = path.node.arguments.slice(1);
                let callExpr = types.callExperssion(path.node.arguments[0], newArray);
                path.replaceWith(callExpr)
            }
        }
    }
}

traverse(ast_code, visitor8)

visitor9 = {
    VariableDeclarator(path) {
        if (types.isObjectExpression(path.node.init)) {
            path.remove();
        }
    }
}

traverse(ast_code, visitor9)

visitor10 = {
    MemberExpression(path) {
        if (types.isStringLiteral(path.node.object) &&
            types.isStringLiteral(path.node.property, {value: 'split'})) {
            console.log(path.node.object.value);
        }
    }
}

traverse(ast_code, visitor10)

visitor11 = {
    MemberExpression(path) {
        if (types.isStringLiteral(path.node.object) &&
            types.isStringLiteral(path.node.property, {value: 'split'})) {
            let varPath = path.findParent(function (p) {
                return types.isVariableDeclartion(p);
            });
            let whilePath = varPath.getBinding(varPath.key + 1);
            let myArr = [];
            whilePath.node.body.body[0].cases.map(function (p) {
                myArr[p.test.value] = p.consequent[0];
            })
            let parentPath = whilePath.parent;
            varPath.remove()
            whilePath.remove()
            let shufferArr = path.node.object.value.split('|');
            shufferArr.map(function (v) {
                parentPath.body.push(myArr[v]);
            })
            path.stop()
        }
    }
}
for (let i = 0; i < 20; i++) {
    traverse(ast_code, visitor11)
}

visitor12 = {
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

traverse(ast_code, visitor12)

fs.writeFile('out.js', generator(ast_code).code, (err) => {
});