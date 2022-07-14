import { parseHTML } from "./parse";

function genProps(attrs) {
  let str = "";
  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs[i];
    if (attr.name === "style") {
      let obj = {};
      attr.value.split(";").forEach((item) => {
        let [key, value] = item.split(":");
        obj[key] = value;
      });
      attr.value = obj;
    }
    str += `${attr.name}:${JSON.stringify(attr.value)},`;
  }
  return `{${str.slice(0, -1)}}`;
}

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // {{asdfasd}} 匹配的内容就是表达式的变量
function gen(node) {
  if (node.type === 1) {
    return codeGen(node);
  } else {
    // 文本
    let { text } = node;
    if (!defaultTagRE.test(text)) {
      return `_v(${JSON.stringify(text)})`;
    } else {
      // _v(_s(name) + 'hello' + _s(name))
      let tokens = [];
      let match;
      defaultTagRE.lastIndex = 0;
      let lastIndex = 0
      while(match = defaultTagRE.exec(text)) {
        let index = match.index;
        if(index > lastIndex) {
          tokens.push(JSON.stringify(text.slice(lastIndex, index)));
        }
        tokens.push(`_s(${match[1].trim()})`)
        lastIndex = index + match[0].length;
      }
      if(lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)));
      }
      return `_v(${tokens.join('+')})`;
    }
  }
}

function genChildren(children) {
  return children.map((child) => gen(child)).join(",");
}

function codeGen(ast) {
  let children = genChildren(ast.children);
  let code = `_c('${ast.tag}',${
    ast.attrs.length > 0 ? genProps(ast.attrs) : "null"
  }${ast.children.length ? `,${children}` : ""})`;
  return code;
}

export function compileToFunction(template) {
  // 1、就是将template转化成ast语法树
  let ast = parseHTML(template);
  // 2、生成render方法 render方法执行后的返回结果就是虚拟DOM

  let render = codeGen(ast);
  console.log(render);
}
