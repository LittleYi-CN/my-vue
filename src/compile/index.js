const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`); // 匹配的分组是一个 标签名 <xxx 匹配到的事开始标签的名字
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配到的事</xxx> 最终匹配到的分组就是结束标签的名字
const attribute =
  /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性
// 第一个分组就是属性的key value 就是分组3/分组4/分组5
const startTagClose = /^\s*(\/?)>/; // <div> <br/>
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // {{asdfasd}} 匹配的内容就是表达式的变量

function parseHTML(html) {
  const ELEMENT_TYPE = 1;
  const TEXT_TYPE = 3;
  const stack = []; // 用于存放元素的
  let currentParent; // 指向的事栈中的最后一个
  let root;

  function createASTElement(tag, attrs) {
    return {
      tag,
      type: ELEMENT_TYPE,
      children: [],
      attrs,
      parent: null,
    };
  }

  // 最终需要转化成一棵抽象语法树
  function start(tag, attrs) {
    let node = createASTElement(tag, attrs); // 创建一个ast节点
    if (!root) {
      // 看一下是否是空树
      root = node; // 如果是空，则当前是树的根节点
    }
    if (currentParent) {
      node.parent = currentParent; // 只赋予了parent属性
      currentParent.children.push(node); // 还需要让父亲记住自己
    }

    stack.push(node);
    currentParent = node; // currentParent为栈中的最后一个
  }

  function chars(text) {
    text = text.replace(/\s/g, '');
    // 文本直接放到当前指向的节点中
    text && currentParent.children.push({
      type: TEXT_TYPE,
      text,
      parent: currentParent
    });
  }

  function end() {
    let node = stack.pop(); // 弹出最后一个
    currentParent = stack[stack.length - 1];
  }
  // html 最开始肯定是一个 <
  function advance(length) {
    html = html.substring(length);
  }
  function parseStartTag() {
    const start = html.match(startTagOpen);
    if (start) {
      const match = {
        tagName: start[1],
        attrs: [],
      };
      advance(start[0].length);
      // 如果不是开始标签的结束，就一直匹配
      let attr, end;
      while (
        !(end = html.match(startTagClose)) &&
        (attr = html.match(attribute))
      ) {
        advance(attr[0].length);
        match.attrs.push({
          name: attr[1],
          value: attr[3] || attr[4] || attr[5] || true,
        });
      }
      if (end) {
        advance(end[0].length);
      }
      return match;
    }

    return false;
  }
  while (html) {
    // 如果textEnd 为0 说明是一个开始标签或者结束标签
    // 如果textEnd > 0 说明就是文本的结束位置
    let textEnd = html.indexOf("<"); // 如果indexOf中的索引是0 则说明是个标签
    if (textEnd == 0) {
      const startTagMatch = parseStartTag();
      if (startTagMatch) {
        // 解析到的开始标签
        start(startTagMatch.tagName, startTagMatch.attrs);
        continue;
      }

      let endTagMatch = html.match(endTag);
      if (endTagMatch) {
        advance(endTagMatch[0].length);
        end();
        continue;
      }
    }
    if (textEnd > 0) {
      let text = html.substring(0, textEnd); // 文本内容

      if (text) {
        chars(text);
        advance(text.length); // 解析到的文本
      }
    }
  }
  console.log(root);
}

export function compileToFunction(template) {
  // 1、就是将template转化成ast语法树
  let ast = parseHTML(template);
  // 2、生成render方法 render方法执行后的返回结果就是虚拟DOM
}
