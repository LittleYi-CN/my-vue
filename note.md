## 一、rollup的环境搭建
1、初始化项目package.json

`npm init -y`

2、安装rollup、rollup解析编译高级语法-表明在rollup中使用babel插件，使用babel就要安装babel核心模块@babel/core, 这个插件要把高级语法转换为低级语法就要安装一些映射@babel/preset-env

`npm install rollup rollup-plugin-babel @babel/core @babel/preset-env --save-dev`

3、package.json配置使用rollup打包，
```
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1",
  "dev": "rollup -cw"
},
```
新建rollup.config.js配置文件
```
// rollup默认可以导出一个对象 作为打包的配置文件
import babel from 'rollup-plugin-babel'
export default {
  input: './src/index.js', // 入口
  output: {
    file: './dist/vue.js', // 出口
    name: 'Vue', // global.Vue
    format: 'umd', // esm es6模块 commonjs模块 IIFE自执行函数 umd（commonjs, amd）
    sourcemap: true, // 希望可以调试源代码
  },
  plugins: [
    babel({
      exclude: 'node-modules/**' // 排除node_modules所有文件,所有的插件都是函数，所以babel()
    }),
  ]
}
```
一般使用babel都会建一个babel的配置文件 `.babelrc`
```
{
  "presets": [
    "@babel/preset-env"
  ]
}
```

## 二、初始化数据
1、响应式的数据变化，数据变化了可以监控到数据的变化。数据的取值和更改值要监控到。
src/index.js构造Vue，并向外暴露。options接受用户的选项，则需要提供一个初始化功能。
```
import { initMixin } from './init'

function Vue(options) {
  this._init(options)
}

initMixin(Vue); // 扩展了init方法

export default Vue
```
2、在src下新建init.js，向Vue添加原型方法，用于初始化。
```
import { initState } from "./state";

export function initMixin(Vue) { // 给Vue增加init方法的
  Vue.prototype._init = function(options) { // 用于初始化操作
    // Vue $options 就是获取用户的配置
    const vm = this;
    vm.$options = options; // 将用户的选项挂载在实例上

    // 初始化状态
    initState(vm);
  }
}
```
3、src下新建state.js，用于初始化状态，向外暴露初始化状态方法,新建初始化数据方法initData
```
export function initState(vm) {
  const ops = vm.$options; //获取所有的选项
  if(ops.data) { // 判断用户选项有没有初始化属性，如果有，则对data进行数据初始化
    initData(vm);
  }
}

function initData(vm) {
  let data = vm.$options.data; // data可能是函数也可能是对象

  data = typeof data === 'function' ? data.call(vm) : data; // data 是用户返回的对象

  vm._data = data; // 将返回的对象放到了_data 上
  // 对数据进行劫持 vue2采用了一个api defineProperty
  observe(data);

  // 将vm._data 用vm来代理就可以了
  for(let key in data) {
    proxy(vm, '_data', key);
  }
}
```

## 三、实现对象的响应式原理
1、src/state.js 调用observe()方法对数据进行劫持。对数据劫持vue2使用的api defineProperty
```
function initData(vm) {
  let data = vm.$options.data; // data可能是函数也可能是对象

  data = typeof data === 'function' ? data.call(vm) : data; // data 是用户返回的对象

  vm._data = data; // 将返回的对象放到了_data 上
  // 对数据进行劫持 vue2采用了一个api defineProperty
  observe(data);

  // 将vm._data 用vm来代理就可以了
  for(let key in data) {
    proxy(vm, '_data', key);
  }
}
```
新建observe文件夹，新建index.js (src/observer/index.js),向外暴露observe(观测)方法
```
export function observe(data) {
  // 对这个对象进行劫持
  if(typeof data !== 'object' || data == null) {
    return; // 只对对象进行劫持
  }

  if(data.__ob__ instanceof Observer) { // 说明这个对象已经被代理过了
    return data.__ob__;
  }
  // 如果一个对象被劫持过了，那就不需要再被劫持了（要判断 一个对象是否被劫持过，可以增添一个实例，用实例来判断是否被劫持过）

  return new Observer(data);
}
```
先判断是否是对象，只对对象进行劫持，不是则直接return。如果一个对象已经被劫持过了，那么就不需要再被劫持了，（要判断一个对象是否被劫持过，可以增添一个实例，用实例来判断是否被劫持）
```
class Observer {
  constructor(data) {
    // Object.defineProperty 只能劫持已经存在的属性（vue里面会为此单独写一些api $set $delete）

    Object.defineProperty(data, '__ob__', { // 给数据加了一个标识， 如果数据上有__ob__说明这个属性被观测
      value: this,
      enumerable: false // 将__ob__变成不可枚举的
    });

    if(Array.isArray(data)) {
      // 这里可以重写数组中的方法 7个变异方法 这些方法是可以修改数组本身的
      // push() pop() shift() unshift() splice() reverse() sort()
      data.__proto__ = newArrayProto // 需要保留数组原有的特性，并且可以重写部分方法
      this.observeArray(data); // 如果数组中放的是对象，可以监控到对象的变化
    }else {
      this.walk(data);
    }
  }

  walk(data) { // 循环对象，对属性依次劫持
    // 重新定义属性
    Object.keys(data).forEach(key => defineReactive(data, key, data[key]));
  }

  // 
  observeArray(data) {
    data.forEach(item => observe(item))
  }
}
// 将数据定义为响应性的方法
export function defineReactive(target, key, value) { // 闭包 属性劫持
  observe(value); // 对所有的对象都进行属性劫持
  Object.defineProperty(target, key, {
    get() { // 取值的时候会执行get
      return value;
    },
    set(newValue) { // 修改的时候会执行set
      if(newValue === value) return;
      observe(newValue);
      value = newValue
    }
  })
}
```
state.js中将返回的对象data以_data挂载在vm上，取值和设置值只能通过vm._data操作，太繁琐，所以将vm.属性代理到vm._data.属性上。在state.js中新建代理方法，循环将属性代理
```
function proxy(vm, target, key) {
  Object.defineProperty(vm, key ,{
    get() {
      return vm[target][key];
    },
    set(newValue) {
      vm[target][key] = newValue;
    }
  })
}
```
state.js直接循环调用proxy方法
```
// 将vm._data 用vm来代理就可以了
for(let key in data) {
  proxy(vm, '_data', key);
}
```
2、只是对data第一层对象进行了劫持，对象中的属性可能还是对象，所以需要递归劫持
所以在定义响应式时对属性再一次进行observe(监测)
```
// 将数据定义为响应性的
export function defineReactive(target, key, value) { // 闭包 属性劫持
  observe(value); // 对所有的对象都进行属性劫持
  Object.defineProperty(target, key, {
    get() { // 取值的时候会执行get
      return value;
    },
    set(newValue) { // 修改的时候会执行set
      if(newValue === value) return;
      observe(newValue);
      value = newValue
    }
  })
}
```

## 四、实现数组的函数劫持
1、修改数组很少用索引操作数组，内部做劫持会浪费性能。一般修改数组都是通过方法进行修改。所以重写数组的方法，对方法进行劫持。有7个方法可以改变数组本身[push,pop,shift,unshift,sort,reverse,splice]。数组中可能也有对象，所以要对数组中进行监测。

src/observe/index.js中添加监控数组的方法observeArray，对数组的每一项进行监测
```
observeArray(data) {
  data.forEach(item => observe(item))
}
```
observe(data)方法调用的时候内部判断是否是数组
```
if(Array.isArray(data)) {
  // 这里可以重写数组中的方法 7个变异方法 这些方法是可以修改数组本身的
  // push() pop() shift() unshift() splice() reverse() sort()
  data.__proto__ = newArrayProto // 需要保留数组原有的特性，并且可以重写部分方法
  this.observeArray(data); // 如果数组中放的是对象，可以监控到对象的变化
}else {
  this.walk(data);
}
```
2、开始对数组的函数进行劫持，但是不能影响其他数组的方法，所以需要保留数组原有的特性，并且可以重写部分方法。在observe文件夹下，新建array.js重写数组部分方法。不能影响之前的方法，所以通过Object.create(oldArrayProto)新建一个数组方法对象。
```
// 重写数组中的部分方法

let oldArrayProto = Array.prototype; // 获取数组的原型

// newArrayProto.__proto__ = oldArrayProto
export let newArrayProto = Object.create(oldArrayProto);

let methods = [ // 找到所有的变异方法
 'push',
 'pop',
 'shift',
 'unshift',
 'reverse',
 'sort',
 'splice'
]

methods.forEach(method => {
  newArrayProto[method] = function(...args) { // 这里重写了数组的方法
    // TODO...
    //内部调用原来的方法,函数的劫持 切片编程
    const result = oldArrayProto[method].call(this, ...args);

    //需要对新增的数据再次进行劫持
    let inserted;
    let ob = this.__ob__;
    switch(method) {
      case 'push':
      case 'unshift':
        inserted = args;
        break;
      case 'splice':
        inserted = args.slice(2);
        break;
      default:
        break;
    }
    if(inserted) { // inserted 是数组
      // 对新增的内容再次进行观测
      ob.observeArray(inserted);
    }
    return result
  }
})
```

## 五、解析模版参数
```
data() {
  return {
    name: 'yiyiyi',
    age: 18,
    address: {
      num: 30,
      content: '光大国际金融中心'
    }
  }
},
el: '#app', // 将数据解析到el元素上
template: '<div>he</div>'
```
将模版中的属性进行一个数据的替换，首先想到的就是模版引擎。
```
// 1、模版引擎，每次把模版拿到，然后用数据替换。性能很差，需要正则匹配替换。vue1.0的时候，没有引入虚拟dom
// 2、采用虚拟dom，数据变化后比较虚拟DOM的差异，最后更新需要更新的地方
// 3、核心就是需要将模版变成js语法，通过js语法生成虚拟DOM

// 从一个东西变成另一个东西 语法之间的转化 es6 -> es5
// css压缩 需要先变成语法树，再重新组装代码成为新的语法，将template语法转换为render函数
// 可以写html，通过el获取，也可以写在template上，也可以通过render方法
```
init.js中判断用户传入的options是否有el，如果有则实现数据的挂载
```
if(options.el) {
  vm.$mount(options.el); // 实现数据的挂载
}
```
在vue原型添加$mount挂载方法
```
Vue.prototype.$mount = function(el) {
  const vm = this;
  el = document.querySelector(el);
  let ops = vm.$options;
  if(!ops.render) { // 先进行查找有没有render函数
    let template;   // 没有render看一下是否写了template，没写template采用外部的template
    if(!ops.template && el) { // 没有写模版，但是写了el
      template = el.outerHTML;
    } else {
      if(el) {
        template = ops.template;
      }
    }
    // 写了template 就用写了的template
    if(template) {
      // 这里需要对模版进行编译
      const render = compileToFunction(template);
      ops.render = render;
    }
  }
}
```
先查找有没有render函数，没有render看一下是否写了template，没写template采用外部的template

新建compile文件夹，新建index.js文件，暴露compileToFunction方法

## 六、实现模版转化成ast语法树
匹配标签正则
```
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`); // 匹配的分组是一个 标签名 <xxx 匹配到的事开始标签的名字
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配到的事</xxx> 最终匹配到的分组就是结束标签的名字
const attribute =
  /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性
// 第一个分组就是属性的key value 就是分组3/分组4/分组5
const startTagClose = /^\s*(\/?)>/; // <div> <br/>
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // {{asdfasd}} 匹配的内容就是表达式的变量
```
创建parseHTML方法，将template转化成ast语法树。

采用while循环执行，html最开始肯定是一个<, 如果indexOf中的索引是0， 则说明是个标签,如果不是大于0，则说明是文本结束的位置。
```
function parseHTML(html) {
  while(html) {
    let textEnd = html.indexOf('<');
  }
}
```
判断如果是开始标签，新建解析开始标签方法parseStartTag。使用正则startTagOpen匹配开始标签，没匹配到则直接return false，匹配到则将结果组装成一个match对象
```
function parseHTML(html) {
  function parseStartTag() {
    const start = html.match(startTagOpen);
    if(start) {
      const match = {
        tagName: start[1], // 标签名
        attrs: []
      }
    }
    return false;
  }
  while(html) {
    let textEnd = html.indexOf('<');
    if(textEnd == 0) {
      parseStartTag();
    }
  }
}
```
因为要对html进行不停的解析，所以匹配到了之后就要把匹配到的在html中干掉，所以新建一个删除方法advance。匹配到之后新建了match对象后执行这个方法,删除匹配到的长度。删除掉之后则开始匹配开始标签中的属性，也是循环匹配，采用while循环,如果没匹配到开始标签的结束，则一直匹配，所以循环条件为!html.match(startTagClose)，用html.match(attribute)匹配属性,每次匹配完之后一样调用advance方法删除匹配到的属性。将开始标签的结束用end存储起来，因为最后属性匹配完了需要删除这个结束符。判断end是否有值，有则表示属性匹配完毕，删除结束符。
```
function parseHTML(html) {
  function advance(length) {
    html = html.substring(length)
  }
  function parseStartTag() {
    const start = html.match(startTagOpen);
    if(start) {
      const match = {
        tagName: start[1], // 标签名
        attrs: []
      }
      advance(start[0].length);
      // 如果不是开始标签的结束，则一直匹配下去
      let attr, end;
      while(!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        advance(attr[0].length)
      }
      if(end) {
        advance(end[0].length)
      }
    }
    return false;
  }
  while(html) {
    let textEnd = html.indexOf('<');
    if(textEnd == 0) {
      parseStartTag();
    }
  }
}
```
属性解析完毕之后，需要将解析出来的属性放到创建的match对象中,最后将match对象return出去。
```
function parseHTML(html) {
  function advance(length) {
    html = html.substring(length)
  }
  function parseStartTag() {
    const start = html.match(startTagOpen);
    if(start) {
      const match = {
        tagName: start[1], // 标签名
        attrs: []
      }
      advance(start[0].length);
      // 如果不是开始标签的结束，则一直匹配下去
      let attr, end;
      while(!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        advance(attr[0].length);
        match.attrs.push({ name: attr[1], value: attr[3] || attr[4] || attr[5] || true })
      }
      if(end) {
        advance(end[0].length)
      }
      return match;
    }
    return false;
  }
  while(html) {
    let textEnd = html.indexOf('<');
    if(textEnd == 0) {
      parseStartTag();
    }
  }
}
```
循环解析html，用startTagMatch接收开始标签的匹配结果。如果startTagMatch有值，则跳出本次循环继续下次循环continue，开始标签总有匹配结束，匹配结束则匹配文本，所以增加textEnd大于0判断，直接截取文本，如果有文本则调用advance方法删除文本。
```
function parseHTML(html) {
  while(html) {
    let textEnd = html.indexOf('<');
    if(textEnd == 0) {
      const startTagMatch = parseStartTag();
      if(startTagMatch) {
        continue;
      }
    }
    if(textEnd > 0) {
      let text = html.substring(0, textEnd); // 文本内容
      if(text) {
        advance(text.length);
      }
    }
  }
}
```
如果不是开始标签，则就是结束标签，使用endTagMatch保存匹配的结束标签，如果匹配到则直接干掉，结束本次循环开始下次循环continue。
```
function parseHTML(html) {
  while(html) {
    let textEnd = html.indexOf('<');
    if(textEnd == 0) {
      const startTagMatch = parseStartTag();
      if(startTagMatch) {
        continue;
      }
      let endTagMatch = html.match(endTag);
      if(endTagMatch) {
        advance(endTagMatch[0].length);
        continue;
      }
    }
    if(textEnd > 0) {
      let text = html.substring(0, textEnd); // 文本内容
      if(text) {
        advance(text.length);
      }
    }
  }
}
```
现在是只把标签删掉了，并没有处理标签，所以新建处理开始文本结束的三个方法start,chars,end。匹配到对应的标签之后调用方法处理。
```
function parseHTML(html) {
  function start(tag, attrs) {

  }
  function chars(text) {

  }
  function end() {

  }
  while(html) {
    let textEnd = html.indexOf('<');
    if(textEnd == 0) {
      const startTagMatch = parseStartTag();
      if(startTagMatch) {
        start(startTagMatch.tagName, startTagMatch.attrs);
        continue;
      }
      let endTagMatch = html.match(endTag);
      if(endTagMatch) {
        advance(endTagMatch[0].length);
        end();
        continue;
      }
    }
    if(textEnd > 0) {
      let text = html.substring(0, textEnd); // 文本内容
      if(text) {
        chars(text);
        advance(text.length);
      }
    }
  }
}
```
最终需要转化成一棵语法树。结构是标签，类型，属性，孩子，父亲。父子关系采用栈结构，先新建一个数组，匹配到开始标签，将标签推进数组，没匹配到结束标签匹配到下一个标签，则继续将标签推进数组，由此可知第二次推进数组的标签是第一个标签的孩子，当匹配到第二个标签的结束标签，则将第二个标签pop出数组，继续匹配。遇见开始标签的时候就创建个AST元素，新建一个方法createASTElement。调用这个方法就取到了这个节点node，判断如果没有根节点，则此节点就是根节点,并且推入栈数组中,并且让当前人指向栈中最后一个。如果是文本的话，则直接为当前节点的孩子。如果是结束标签，则直接弹出并且更新当前currentParent。开始标签中，如果currentParent有值，则node的父亲指向currentParent
```
function parseHTML(html) {
  const ELEMENT_TYPE = 1;
  const TEXT_TYPE = 3;
  const stack = []; // 用于存放标签
  let currentParent; // 指向的事栈中的最后一个
  let root;

  function createASTElement(tag, attrs) {
    return {
      tag,
      type: ELEMENT_TYPE,
      children: [],
      attrs,
      parent: null
    }
  }

  function start(tag, attrs) {
    let node = createASTElement(tag, attrs); // 创建一个ast节点
    if(!root) { // 看一下是否是空树
      root = node; // 如果为空则当前是树的根节点
    }
    if(currentParent) {
      node.parent = currentParent;
      currentParent.children.push(node);
    }
    stack.push(node);
    currentParent = node; // currentParent为栈中的最后一个
  }
  function chars(text) { // 文本直接放到当前指向的节点中
    text = text.replace(/\s/g, '');
    text && currentParent.children.push({
      type: TEXT_TYPE,
      text,
      parent: currentParent
    })
  }
  function end() {
    stack.pop();
    currentParent = stack[stack.length - 1];
  }
}
```

## 七、代码生成实现原理
新建/compile/parse.js文件，将parseHTML函数代码写入此文件，暴露此方法，返回root。

新建codeGen代码生成方法，接受参数ast语法树。字符串拼接，return一个字符串。
_c 创建元素 _v 创建文本 _s JSON.stringify
```
let code = `_c('${ast.tag}',${
    ast.attrs.length > 0 ? genProps(ast.attrs) : "null"
  }${ast.children.length ? `,${children}` : ""})`;
```
判断ast的属性attrs长度是否大于0，新建生成属性方法genProps
```
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
```
判断孩子长度是否大于0，新建生成孩子的方法genChildren
```
function genChildren(children) {
  return children.map((child) => gen(child)).join(",");
}
```
新建gen方法,判断是元素还是文本节点，如果是元素，直接调用codeGen代码生成方法。使用正则匹配，如果没有匹配到说明是普通文本，则直接返回_v 创建文本，如果匹配到则表明是{{变量}}文本，再进行处理。使用while循环不停匹配，使用正则方法exec获取匹配的字符，因为正则写了g表示全局，使用exec储存了匹配的index，所以每次捕获之前需要将lastIndex置为0。将捕获的内容推入tokens，如果匹配的变量之间有普通文本，所以存储一个lastIndex位置，使用位置判断，循环时如果当前index大于lastIndex，则截取这段普通文本推入tokens。最后也可能存在普通文本，所以判断最后的位置是否等于文本的长度，小于则表示最后有普通文本，使用字符串截取推入tokens，最后返回。
```
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
```

## 八、开始准备执行render函数

codeGen代码生成函数返回code，在compileToFunction函数中用code接收codeGen生成的code。需要将这个code运行，所以使用new Function(code) 创建这个render函数,最后返回这个render函数。使用with改变作用域，code中的变量从此作用域取值。
```
let code = codeGen(ast);
code = `with(this){return ${code}}`;
let render = new Function(code)
return render;
```
>模版引擎的实现原理就是 `with` + `new Function()`实现。

回到init.js中，调用compileToFunction就可以接收到render函数。将接收到的render函数挂载到vm.$options上。这样就可以通过调用render函数实现代码的初渲染。所以下一步就是调用render方法。新建mountComponent方法，调用此方法实现组件的挂载，将此方法提取到lifecycle.js文件中，目的就是调用一下render方法，产生虚拟DOM，有了虚拟DOM再去渲染到el中。
```
mountComponent(vm, el);
```
新建lifecycle.js生命周期文件，暴露mountComponent方法。
1. 调用render方法产生虚拟DOM
2. 根据虚拟DOM产生真实DOM
3. 插入到el元素中
调用vm._render() 就是调用vm.$options.render方法，返回虚拟节点。调用vm._update() 产生真实DOM
```
export function mountComponent(vm, el) {
  // 1、调用render方法产生虚拟节点 虚拟DOM
  vm._update(vm._render()); // vm.$options.render() 虚拟节点 ._update() 生成真实DOM
  // 2、根据虚拟DOM产生真实DOM

  // 3、插入到el元素中
}
```

在src/index.js调用initLifecycle方法`initLifecycle(Vue)`，扩展一下生命周期功能。在lifecycle.js中向外暴露initLifecycle方法。
```
export function initLifecycle(Vue) {
  // 变成真实DOM
  Vue.prototype._update = function() {
    console.log('update');
  }
  // 渲染虚拟DOM
  Vue.prototype._render = function() {
    console.log('render');
  }
}
```
```
// vue 核心流程
// 1、创造了响应式数据
// 2、模版转化成ast语法树
// 3、将ast语法树转换成render函数
// 4、后续每次数据更新可以只执行render函数（无需再次执行ast转化的过程）

// render函数会去产生虚拟节点（使用响应式数据）
// 根据生成的虚拟节点创造真实的DOM
```

## 九、实现虚拟dom转化成真实DOM
在Vue.prototype._render中调用通过ast语法转义后生成的render方法，将this传入
```
// 渲染虚拟DOM
Vue.prototype._render = function () {
 const vm = this;
 // 让with中的this指向vm
 // 当渲染的时候就会去实例中取值，就可以将属性和视图绑定在一起
 return vm.$options.render.call(vm); // 通过ast语法转义后生成的render方法
};
```
向Vue原型挂载_c, _v, _s方法
```
// _c('div', {}, ...children)
Vue.prototype._c = function () {
 return createElementVNode(this, ...arguments);
};
// _v(text)
Vue.prototype._v = function () {
 return createTextVNode(this, ...arguments);
};

Vue.prototype._s = function (value) {
 if (typeof value !== "object") {
   return value;
 }
 return JSON.stringify(value);
};
```
将和diff算法有关的方法抽取到一个文件中/vnode/index.js
```
// h() _c()
export function createElementVNode(vm, tag, data, ...children) {
  if(data == null) {
    data = {};
  }
  let key = data.key;
  if(key) {
    delete data.key;
  }
  return vnode(vm, tag, key, data, children);
}

// _v()
export function createTextVNode(vm, text) {
  return vnode(vm, undefined, undefined, undefined, undefined, text);
}

function vnode(vm, tag, key, data, children, text) {
  return {
    vm,
    tag,
    key,
    data,
    children,
    text
  }
}
```
_render方法返回虚拟dom之后，就需要_update将虚拟dom转化为真实dom。在_update方法里面调用patch方法，新建patch方法，既可以初始化，又可以更新。
```
// 变成真实DOM
Vue.prototype._update = function (vnode) {
 // 将vnode转化成真实dom
 const vm = this;
 const el = vm.$el;

 // patch既有初始化的功能，又有更新的功能
 vm.$el = patch(el, vnode);
};
```
patch方法判断是否是真实DOM，真实DOM就是初次渲染，根据虚拟Dom创建真实DOM，新建createElm方法,返回真实DOM，并将真实DOM挂载到虚拟DOM的el属性上。
```
function patch(oldVNode, vnode) {
  // 写的是初渲染流程
  const isRealElement = oldVNode.nodeType;

  if (isRealElement) {
    const elm = oldVNode; // 获取真实元素
    const parentElm = elm.parentNode; // 拿到父元素

    let newElm = createElm(vnode);
    parentElm.insertBefore(newElm, elm.nextSibling);
    parentElm.removeChild(elm);

    return newElm;
  } else {
    // diff 算法
  }
}
```
```
function createElm(vnode) {
  let { tag, data, children, text } = vnode;
  if (typeof tag === "string") {
    vnode.el = document.createElement(tag); // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了，可以直接找到虚拟节点上挂载的真实节点修改

    patchProps(vnode.el, data);

    children.forEach((child) => {
      vnode.el.appendChild(createElm(child));
    });
  } else {
    vnode.el = document.createTextNode(text);
  }

  return vnode.el;
}
```
新建patchProps方法，更新属性。
```
function patchProps(el, props) {
  for (let key in props) {
    if (key === "style") {
      for (let styleName in props.style) {
        el.style[styleName] = props.style[styleName];
      }
    } else {
      el.setAttribute(key, props[key]);
    }
  }
}
```

## 十、实现vue中的依赖收集
1. 将数据先处理成响应式 initState （针对对象来说主要是增加defineProperty 针对数组就是重写方法）
2. 模版编译：将模版先转换成ast语法树，将ast语法树生成render方法
3. 调用render函数 会进行取值操作 产生对应的虚拟DOM render() {_c('div', null, _v(name))}
4. 将虚拟dom渲染成真实dom

- 我们可以给模版中的属性增加一个收集器 dep
- 页面渲染的时候，将渲染逻辑封装到watcher
- 让dep记住watcher，稍后属性变化了可以找到对应的dep中存放的watcher进行重新渲染

组件化的好处？
- 复用
- 方便维护
- 局部更新

新建/observe/watcher.js, 新建Watcher类，为了标识每个实例，为每个实例添加id。参数为vm和渲染方法。每次调用render方法都会调用defineProperty的get方法，所以用getter存储一下render
```
let id = 0;
class Watcher { // 不同组件有不同的watcher
  constructor(vm, fn, options) {
    this.id = id ++;
    this.renderWatcher = options; // 是一个渲染watcher
    this.getter = fn; // getter意味着调用这个函数可以发生取值操作
    this.get();
  }

  get() {
    this.getter(); // 会去vm上取值
  }
}

export default Watcher;
```
在lifecycle.js的mountComponent方法中，调用watcher。
```
// 1、调用render方法产生虚拟节点 虚拟DOM
const updateComponent = () => {
  vm._update(vm._render()); // vm.$options.render() 虚拟节点 ._update() 生成真实DOM
};
// 2、根据虚拟DOM产生真实DOM
const watcher = new Watcher(vm, updateComponent, true); // true用于标识是一个渲染watcher
```

需要给每个属性增加一个dep，目的就是收集watcher。一个组件中 有多少个属性（n个属性会对应一个组件） n个dep对应一个watcher。一个属性会对应多个组件 一个dep对应多个watcher。多对多的关系。

新建/observe.dep.js,目的是每个属性都有一个dep。
```
let id = 0;

class Dep {
  constructor() {
    this.id = id++; // 属性的dep要手机watcher
    this.subs = []; // 这里存放着当前属性对应的watcher有哪些
  }
}

export default Dep;
```
在/observe/index.js的defineReactive方法中，调用dep。
```
// 将数据定义为响应性的
export function defineReactive(target, key, value) { // 闭包 属性劫持
  observe(value); // 对所有的对象都进行属性劫持
  let dep= new Dep(); // 每一个属性都有一个dep
  Object.defineProperty(target, key, {
    get() { // 取值的时候会执行get
      if(Dep.target) {
        dep.depend(); // 让这个属性的收集器记住watcher
      }
      return value;
    },
    set(newValue) { // 修改的时候会执行set
      if(newValue === value) return;
      observe(newValue);
      value = newValue
      dep.notify(); // 通知更新
    }
  })
}
```
为了让dep和watcher有关联，在dep.js Dep这个类上增加一个静态属性，target。在watcher.js调用get方法时，将当前实例挂载到Dep.target上，渲染完成后再将Dep.target置为null
```
Dep.target = null;
```
```
get() {
  Dep.target = this; // 静态属性就是只有一份
  this.getter(); // 会去vm上取值
  Dep.target = null; // 渲染完就清空
}
```
1. 当创建渲染watcher时会把当前的渲染watcher放到Dep.target上
2. 调用_render()时会取值 走到get上,就可以判断Dep上是否有target属性，让这个属性的收集器记住watcher，dep.js增加depend方法。
但是不希望收集重复的watcher，而且dep要收集watcher，watcher要记住dep。在watcher中也要添加dep数组，并且添加一个depsId数组，不要重复。所以收集函数depend就不要直接往subs数组push，而是告诉watcher记住dep，调用watcher的addDep方法，传入dep。再从watcher.js中调用dep.js的addSub方法，让dep也记住watcher。
```
class Dep {
  constructor() {
    this.id = id++; // 属性的dep要手机watcher
    this.subs = []; // 这里存放着当前属性对应的watcher有哪些
  }
  depend() {
    // 不希望放重复的watcher
    // this.subs.push(Dep.target);

    Dep.target.addDep(this); // 让watcher记住dep
  }

  addSub(watcher) {
    this.subs.push(watcher);
  }
}
```
```
class Watcher { // 不同组件有不同的watcher
  constructor(vm, fn, options) {
    this.id = id++;
    this.renderWatcher = options; // 是一个渲染watcher
    this.getter = fn; // getter意味着调用这个函数可以发生取值操作
    this.deps = []; // 后续实现计算属性和一些清理工作需要用到
    this.depsId = new Set();
    this.get();
  }

  get() {
    Dep.target = this; // 静态属性就是只有一份
    this.getter(); // 会去vm上取值
    Dep.target = null; // 渲染完就清空
  }

  addDep(dep) { // 一个组件对应多个属性 重复的属性也不用记录
    let id = dep.id;
    if(!this.depsId.has(id)) {
      this.deps.push(dep);
      this.depsId.add(id);
      dep.addSub(this);
    }
  }
}
```
更新时，调用/observe/index.js中的defineReactive中的set，调用dep的notify方法，通知更新。在dep.js新增notify方法,告诉每个watcher调用render方法。
```
class Dep {
  constructor() {
    this.id = id++; // 属性的dep要手机watcher
    this.subs = []; // 这里存放着当前属性对应的watcher有哪些
  }
  depend() {
    // 不希望放重复的watcher
    // this.subs.push(Dep.target);

    Dep.target.addDep(this); // 让watcher记住dep
  }

  addSub(watcher) {
    this.subs.push(watcher);
  }

  notify() {
    this.subs.forEach((watcher) => watcher.update());
  }
}
```
```
class Watcher { // 不同组件有不同的watcher
  constructor(vm, fn, options) {
    this.id = id++;
    this.renderWatcher = options; // 是一个渲染watcher
    this.getter = fn; // getter意味着调用这个函数可以发生取值操作
    this.deps = []; // 后续实现计算属性和一些清理工作需要用到
    this.depsId = new Set();
    this.get();
  }

  get() {
    Dep.target = this; // 静态属性就是只有一份
    this.getter(); // 会去vm上取值
    Dep.target = null; // 渲染完就清空
  }

  addDep(dep) { // 一个组件对应多个属性 重复的属性也不用记录
    let id = dep.id;
    if(!this.depsId.has(id)) {
      this.deps.push(dep);
      this.depsId.add(id);
      dep.addSub(this);
    }
  }

  update() {
    this.get();
  }
}
```

## 十一、实现异步更新原理
每次更新属性变化都会更新一次，浪费性能。所以要实现多次更新渲染一次，采用事件循环的方式，等待当前script脚本中同步代码执行完毕之后再去执行异步任务。/observe/watcher.js中的update，将更新放到队列中缓存起来再更新，新建方法queueWatcher。将所有的watcher放入队列中，去重。传入this，把当前watcher缓存起来。
```
update() {
    queueWatcher(this); // 吧当前的watcher暂存起来
    // this.get();
  }
```
watcher去重，判断has是否有watcher的id，没有再往里放。增加皮助理变量pending，不管更新几次，只走一次。
```
let queue = [];
let has = {};
let pending = false; // 防抖
function queueWatcher(watcher) {
  const id = watcher.id;
  if (!has[id]) {
    queue.push(watcher);
    has[id] = true;
    console.log(queue);
    // 不管update执行多少次，但是最终只执行一轮刷新操作。
    if (!pending) {
      // nextTick(flushSchedulerQueue);
      setTimeout(flushSchedulerQueue, 0)
      pending = true;
    }
  }
}
```
新增刷新方法,watcher新增run方法就是渲染逻辑
```
function flushSchedulerQueue() {
  let flushQueue = queue.slice(0);
  queue = [];
  has = {};
  pending = false;
  flushQueue.forEach((q) => q.run()); // 在刷新的过程中，可能还有新的watcher，重新放到queue中
}
run() {
    this.get(); // 渲染的时候用的是最新的vm来渲染的
  }
```
不确定用户用setTimeout还是promise来实现，所以新增一个统一的方法nextTick, queueWatcher方法调用nextTick方法。Vue的原型上扩展$nextTick,这样用户也可以调用，内部也可以调用。nextTick不是创建了一个异步任务，而是将这个任务维护到了队列中而已。
```
let callbacks = [];
let waiting = false;

function flushCallbacks() {
  waiting = false;
  let cbs = callbacks.slice(0);
  callbacks = [];
  cbs.forEach((cb) => cb());
}
export function nextTick(cb) {
  callbacks.push(cb); // 维护nexttick中的callback
  if (!waiting) {
    timerFunc(flushCallbacks);
    // setTimeout(() => {
    //   flushCallbacks(); // 最后一起刷新
    // }, 0);
    waiting = true;
  }
}

function queueWatcher(watcher) {
  const id = watcher.id;
  if (!has[id]) {
    queue.push(watcher);
    has[id] = true;
    console.log(queue);
    // 不管update执行多少次，但是最终只执行一轮刷新操作。
    if (!pending) {
      nextTick(flushSchedulerQueue);
      pending = true;
    }
  }
}

Vue.prototype.$nextTick = nextTick;
```
nextTick中没有直接使用某个api 而是采用优雅降级的方式
内部先采用promise（ie不兼容）MutationObserver（h5） setImmediate setTimeout

```
let timerFunc;
if (Promise) {
  timerFunc = () => {
    Promise.resolve().then(flushCallbacks);
  };
} else if (MutationObserver) {
  let observer = new MutationObserver(flushCallbacks); // 这里传入的回调是异步执行的
  let textNode = document.createTextNode(1);
  observer.observe(textNode, {
    characterData: true,
  });
  timerFunc = () => {
    textNode.textContent = 2;
  };
} else if(setImmediate) {
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  timerFunc = () => {
    setTimeout(flushCallbacks);
  }
}
```

## 十二、实现mixin核心功能
vue.mixin 混入 可以混合一些公共方法。一般不混入data，数据来源不明确。新建/src/globalApi.js文件，暴露initGlobalAPI方法，向Vue添加静态属性options，添加静态方法mixin。调用mergeOptions合并options与用户调用mixin传入的options。
```
import { mergeOptions } from "./util";

export function initGlobalAPI(Vue) {
  Vue.options = {};

  // 静态方法
  Vue.mixin = function (mixin) {
    // 期望将用户的选项和全局的options进行合并
    this.options = mergeOptions(this.options, mixin);
    return this;
  };
}
```

新建/src/util.js工具类，暴露mergeOptions方法，此方法返回options，接收父options，子options，分别循环，子options循环时，如果父没有调用mergeField方法，新建mergeField方法，判断策略strats是否有，策略中没有则以儿子为主。
```
export function mergeOptions(parent, child) {
  const options = {};
  for (let key in parent) {
    // 循环老的
    mergeField(key);
  }

  for (let key in child) {
    if (!parent.hasOwnProperty(key)) {
      mergeField(key);
    }
  }

  function mergeField(key) {
    // 策略模式 减少if else
    if (strats[key]) {
      options[key] = strats[key](parent[key], child[key]);
    } else {
      // 如果不在策略中以儿子为主
      options[key] = child[key] || parent[key]; // 优先采用儿子再采用父亲
    }
  }
  return options;
}
```
```
const strats = {};
const LIFECYCLE = ["beforeCreate", "created"];
LIFECYCLE.forEach((hook) => {
  strats[hook] = function (p, c) {
    if (c) {
      if (p) {
        return p.concat(c);
      } else {
        return [c];
      }
    } else {
      return p;
    }
  };
});
```

init.js中，vm.$options采用mergeOptions，合并Vue的options和用户传入的options，this.constructor.options,this指Vue的实例，构造函数指向Vue。lifecycle.js新增callHook方法，接收参数实例，和钩子名称，遍历options。
```
vm.$options = mergeOptions(this.constructor.options, options); // 将用户的选项挂载在实例上

callHook(vm, 'beforeCreate')
// 初始化状态
initState(vm);
callHook(vm, 'created')
```

## 十三、实现计算属性
- 计算属性的特点是具备缓存的，模版中多次取值，返回值不发生变化方法就获取一次，有个脏值检测的机制，检测这个值有没有变脏（有没有被修改），如果被修改了，取值的时候会重新计算，如果模版中没有就不会计算取值。
- 依赖的值发生变化才会重新执行用户的方法。计算属性中要维护一个dirty属性，初始是true，脏的，所以会计算并将dirty置为false，就不会重新计算，当依赖的属性发生变化，dirty重新置为true，重新取值计算。
- 默认计算属性不会立刻执行。
- 计算属性就是defineProperty。
- 计算属性也是一个watcher，默认渲染会创造一个渲染watcher

在/observe/dep.js新建stack属性，暴露两个方法pushTarget和popTarget，保存和删除watcher。渲染的时候将watcher入栈，渲染完毕将watcher出栈。
```
let stack = [];
export function pushTarget(watcher) {
  stack.push(watcher);
  Dep.target = watcher;
}

export function popTarget() {
  stack.pop();
  Dep.target = stack[stack.length - 1];
}
```
在/observe/watcher.js中修改get方法。
```
get() {
  // Dep.target = this; // 静态属性就是只有一份
  pushTarget(this);
  let value = this.getter.call(this.vm); // 会去vm上取值
  // Dep.target = null; // 渲染完就清空
  popTarget();
  return value;
}
```
在/src/state.js中判断用户是否传入computed，进行处理。新增初始化computed方法initComputed
```
if (ops.computed) {
  initComputed(vm);
}
```
initComputed拿到用户传入的computed之后，循环，判断get是方法还是对象。新增定义计算属性的方法defineComputed
```
function initComputed(vm) {
  const computed = vm.$options.computed;
  const watchers = vm._computedWatchers = [];
  for (let key in computed) {
    let userDef = computed[key];
    let fn = typeof userDef === "function" ? userDef : userDef.get;
    // 需要监控计算属性中get的变化
    // 如果直接new Watcher() 就会默认执行fn, 将属性和watcher对应起来
    watchers[key] = new Watcher(vm, fn, { lazy: true });

    defineComputed(vm, key, userDef);
  }
}
```
target就是实例，key就是计算属性名，userDef就是具体的计算属性。
```
function defineComputed(target, key, userDef) {
  const getter = typeof userDef === "function" ? userDef : userDef.get;
  const setter = userDef.set || (() => {});
  Object.defineProperty(target, key, {
    get: createComputedGetter(key),
    set: setter,
  });
}
```
但是有一个问题，模版中多次取同一个计算属性，会计算多次，消耗性能，需要加缓存，就会有一个依赖关系，计算属性中应该也有一个watcher，所以要定义一个watcher，即上面的
```
const watchers = vm._computedWatchers = [];
// 需要监控计算属性中get的变化
// 如果直接new Watcher() 就会默认执行fn, 将属性和watcher对应起来
watchers[key] = new Watcher(vm, fn, { lazy: true });
```
fn就是get方法，选项lazy作为一个标识，表示这是一个计算属性watcher。并将计算属性watcher存起来。如果是new Watcher()就会立即执行fn，所以传入lazy判断，不立即执行。在watcher.js进行判断,并且新增一个dirty为了实现缓存。
```
this.lazy = options.lazy;
this.dirty = this.lazy;
this.vm = vm;
this.lazy ? undefined : this.get();
```
等取值的时候在调这个get，所以在state.js的defineComputed调用createComputedGetter方法，新建这个方法。因为需要在createComputedGetter中取到watcher，这个方法里的this就是实例vm，所以在initComputed方法中将watcher也挂载到vm._computedWatchers，可以直接从实例vm上取。第一次执行肯定是脏的，判断dirty，调用evaluate计算方法，watcher.js中新建evaluate方法，调用get，并将dirty置为false。
```
// 计算属性根本不会收集依赖 只会让自己的依赖属性去收集依赖
function createComputedGetter(key) {
  // 需要检测是否要执行这个getter
  return function() {
    const watcher = this._computedWatchers[key]; // 获取到对应属性的watcher
    if(watcher.dirty) {
      watcher.evaluate(); // 求值后 dirty变为false， 下次就不求值了
    }
    if(Dep.target) {
      // 计算属性出栈后 还要渲染watcher 应该让计算属性watcher里面的属性 也去收集上层watcher
      watcher.depend();
    }
    return watcher.value; // 最后返回的是watcher上的值
  }
}
```
```
evaluate() {
    this.value = this.get(); // 获取到用户函数的返回值，并且还要标识为脏
    this.dirty = false;
  }
```
因为createComputedGetter返回一个getter方法，方法内需返回值，所以在watcher.js的get方法中返回一个this.getter的值。改变一个this.getter的指向，this从vm上取值。
```
get() {
  // Dep.target = this; // 静态属性就是只有一份
  pushTarget(this);
  let value = this.getter.call(this.vm); // 会去vm上取值
  // Dep.target = null; // 渲染完就清空
  popTarget();
  return value;
}
```
属性发生变化，计算属性也需要修改，所以在更新的时候判断是否lazy，是则将dirty重新置为true，在watcher.js中的update方法新增判断。这样修改后页面还是没有渲染，是因为这样只是计算属性watcher更新了dirty，渲染watcher没有重新执行。
```
update() {
  if(this.lazy) {
    // 如果是计算属性 依赖的值变化了 就标识计算属性是脏值了
    this.dirty = true;
  } else {
    queueWatcher(this); // 吧当前的watcher暂存起来
    // this.get();
  }
}
```
如果计算属性在模版中使用了，需要让计算属性中依赖的属性也要记住渲染watcher。在state.js的createComputedGetter判断Dep.target，计算属性watcher出栈后还有渲染watcher。
```
if(Dep.target) {
  // 计算属性出栈后 还要渲染watcher 应该让计算属性watcher里面的属性 也去收集上层watcher
  watcher.depend();
}
```
watcher.js新增depend方法。
```
depend() {
  let i = this.deps.length;
  while(i--) {
    this.deps[i].depend(); // 让计算属性watcher也收集渲染watcher
  }
}
```

## 十四、watch的实现原理
/src/index.js中给Vue原型挂载$watch方法。
```
// 最终调用的都是这个方法
Vue.prototype.$watch = function (exprOrFn, cb, options = {}) {
  new Watcher(this, exprOrFn, { user: true }, cb);
};
```
/src/state.js中判断用户传入的options是否有watch，如果有则调用初始化watch方法initWatch
```
if(ops.watch) {
  initWatch(vm);
}
```
watch可能是字符串，数组，函数，所以循环判断处理，新增创建watch方法。
```
function initWatch(vm) {
  let watch = vm.$options.watch;

  for(let key in watch) {
    // 字符串 数组 函数
    const handler = watch[key];
    if(Array.isArray(handler)) {
      for(let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}
```
```
function createWatcher(vm, key, handler) {
  // 字符串 函数
  if(typeof handler === 'string') {
    handler = vm[handler];
  }
  return vm.$watch(key, handler)
}
```
在/src/index.js的$watch方法创建新的watcher。this当前实例， exprOrFn表达式或方法，user: true表示用户创建的watch,cb watch的回调。
```
new Watcher(this, exprOrFn, { user: true }, cb);
```
再处理watcher.js的构造函数。判断传入的exprOrFn是字符串还是方法，如果是字符串，包装成方法。将cb和user用this接收。用this.value存储一下老值oldValue。
```
constructor(vm, exprOrFn, options, cb) {
  this.id = id++;
  this.renderWatcher = options; // 是一个渲染watcher
  if(typeof exprOrFn === 'string') {
    this.getter = function() {
      return vm[exprOrFn];
    }
  } else {
    this.getter = exprOrFn; // getter意味着调用这个函数可以发生取值操作
  }
  this.deps = []; // 后续实现计算属性和一些清理工作需要用到
  this.depsId = new Set();
  this.lazy = options.lazy;
  this.cb = cb;
  this.dirty = this.lazy;
  this.vm = vm;
  this.user = options.user;
  this.value = this.lazy ? undefined : this.get();
}
```
属性变化后走到run方法，this.get()即为新值newValue，run方法中判断是否是用户的watch，是则调this.cb执行用户watch的回调，call改变指向为当前实例，传入newValue，oldValue。
```
run() {
  let oldValue = this.value;
  let newValue = this.get(); // 渲染的时候用的是最新的vm来渲染的
  if(this.user) {
    // console.log(this.cb)
    this.cb.call(this.vm, newValue, oldValue);
  }
}
```

## 十五、数组更新实现原理
在/observe/index.js的构造函数中，为每个对象都增加收集功能
```
// 这个data可能是数组或者对象， 给每个对象都增加收集功能
this.dep = new Dep();
```
defineReactive方法中用childOb接收observe返回实例，get取值时判断childOb是否存在，存在则收集依赖。如果数组中还嵌套有数组，调用push等方法还是不更新，get中判断是否是数组如果是则让数组再次依赖收集，新增dependArray方法。
```
// 将数据定义为响应性的
export function defineReactive(target, key, value) { // 闭包 属性劫持
  let childOb = observe(value); // 对所有的对象都进行属性劫持 childOb就是用来收集依赖的
  let dep= new Dep(); // 每一个属性都有一个dep
  Object.defineProperty(target, key, {
    get() { // 取值的时候会执行get
      if(Dep.target) {
        dep.depend(); // 让这个属性的收集器记住watcher
        if(childOb) {
          childOb.dep.depend(); // 让数组和对象本身也实现依赖收集 
          if(Array.isArray(value)) {
            dependArray(value);
          }
        }
      }
      return value;
    },
    set(newValue) { // 修改的时候会执行set
      if(newValue === value) return;
      observe(newValue);
      value = newValue
      dep.notify(); // 通知更新
    }
  })
}

function dependArray(value) {
  for(let i = 0; i < value.length; i++) {
    let current = value[i];
    current.__ob__ && current.__ob__.dep.depend();
    if(Array.isArray(current)) {
      dependArray(current);
    }
  }
}
```
array.js中通知一下需要更新
```
methods.forEach(method => {
  newArrayProto[method] = function(...args) { // 这里重写了数组的方法
    // TODO...
    const result = oldArrayProto[method].call(this, ...args); // 内部调用原来的方法， 函数的劫持 切片编程

    //需要对新增的数据再次进行劫持
    let inserted;
    let ob = this.__ob__;
    switch(method) {
      case 'push':
      case 'unshift':
        inserted = args;
        break;
      case 'splice':
        inserted = args.slice(2);
        break;
      default:
        break;
    }
    if(inserted) { // inserted 是数组
      // 对新增的内容再次进行观测
      ob.observeArray(inserted);
    }
    ob.dep.notify();
    return result
  }
})
```

## 十六、实现基本的diff算法
先整理一下代码，将src/index.js的nextTick和watch提取出来，提取到src/state.js中
```
export function initStateMixin(Vue) {
  Vue.prototype.$nextTick = nextTick;

  // 最终调用的都是这个方法
  Vue.prototype.$watch = function (exprOrFn, cb, options = {}) {
    new Watcher(this, exprOrFn, { user: true }, cb);
  };
}
```
src/index.js中调用这个initStateMixin方法
```
initMixin(Vue); // 扩展了init方法
initLifecycle(Vue); // vm._update vm._render
initGlobalAPI(Vue); // 全局api的实现
initStateMixin(Vue); // 实现了nextTick $watch
```

为了方便观察前后的虚拟节点，先在src/index.js中创建两个虚拟节点
```
let render1 = compileToFunction(`<ul key="a" style="color:red;">
  <li key="a">a</li>
  <li key="b">b</li>
  <li key="c">c</li>
</ul>`);
let vm1 = new Vue({
  data: { name: "yi" },
});
let prevVNode = render1.call(vm1);

// 如果用户自己操作dom， 可能会有些问题
let render2 = compileToFunction(`<ul key="a" style="color:red;background:blue;">
  <li key="a">a</li>
  <li key="b">b</li>
  <li key="c">c</li>
  <li key="d">d</li>
</ul>`);
let vm2 = new Vue({
  data: { name: "qi" },
});
let nextVNode = render2.call(vm2);
let prevNode = createElm(prevVNode);
document.body.appendChild(prevNode);

let nextNode = createElm(nextVNode);
// 不是直接替换，而是比较两个人的区别之后在替换
setTimeout(() => {
  patch(prevVNode, nextVNode);
  // prevNode.parentNode.replaceChild(nextNode, prevNode)
}, 1000);
```
将src/lifecycle.js中和虚拟节点相关的三个方法createElm, patchProps, patch抽取到src/vdom/patch.js中，暴露出去
```
export function createElm(vnode) {
  let { tag, data, children, text } = vnode;
  if (typeof tag === "string") {
    vnode.el = document.createElement(tag); // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了，可以直接找到虚拟节点上挂载的真实节点修改

    patchProps(vnode.el, data);

    children.forEach((child) => {
      vnode.el.appendChild(createElm(child));
    });
  } else {
    vnode.el = document.createTextNode(text);
  }

  return vnode.el;
}

export function patchProps(el, props) {
  for (let key in props) {
    // 用新的覆盖掉老的
    if (key === "style") {
      for (let styleName in props.style) {
        el.style[styleName] = props.style[styleName];
      }
    } else {
      el.setAttribute(key, props[key]);
    }
  }
}

export function patch(oldVNode, vnode) {
  // 写的是初渲染流程
  const isRealElement = oldVNode.nodeType;

  if (isRealElement) {
    const elm = oldVNode; // 获取真实元素
    const parentElm = elm.parentNode; // 拿到父元素

    let newElm = createElm(vnode);
    parentElm.insertBefore(newElm, elm.nextSibling);
    parentElm.removeChild(elm);

    return newElm;
  } else {
    // diff 算法
  }
}
```
diff算法不是直接将新的节点替换掉老的节点，而是比较两个区别之后再进行替换。diff算法是一个平级比较的过程 父亲和父亲比较 儿子和儿子比对。在src/index.js的setTimeout中调用patch方法传入老的和新的虚拟节点。在src/vdom/patch.js的patch方法中，如果不是第一次渲染则走下面的判断方法。
1. 两个节点不是同一个节点，直接删除老的换上新的（没有比对了）
2. 两个节点是同一个节点(判断节点的tag和节点key) 比较两个节点的属性是否有差异（复用老的节点，将差异的属性更新）
3. 节点比较完毕后就需要比较两人的儿子

在src/vdom/index.js中新增判断是否是同一个虚拟节点的方法isSameVNode,判断方法为标签和key是否一致，一致则认为是同一节点。
```
export function isSameVNode(vNode1, vNode2) {
  return vNode1.tag === vNode2.tag && vNode1.key === vNode2.key;
}
```

在src/vdom/patch.js中新增判断虚拟节点的方法patchVNode, 在patch方法中调用这个方法。调用isSameVNode判断如果不是同一节点，直接用新的节点替换老的节点。
```
function patchVNode(oldVNode, vnode) {
  if (!isSameVNode(oldVNode, vnode)) {
    // 1、两个节点不是同一个节点，直接删除老的换上新的（没有比对了）
    // 用老节点的父亲 进行替换
    let el = createElm(vnode);
    oldVNode.el.parentNode.replaceChild(el, oldVNode.el);
    return el;
  }
}
```
```
export function patch(oldVNode, vnode) {
  // 写的是初渲染流程
  const isRealElement = oldVNode.nodeType;

  if (isRealElement) {
    const elm = oldVNode; // 获取真实元素
    const parentElm = elm.parentNode; // 拿到父元素

    let newElm = createElm(vnode);
    parentElm.insertBefore(newElm, elm.nextSibling);
    parentElm.removeChild(elm);

    return newElm;
  } else {
    // diff 算法
    // 1、两个节点不是同一个节点，直接删除老的换上新的（没有比对了）
    // 2、两个节点是同一个节点(判断节点的tag和节点key) 比较两个节点的属性是否有差异（复用老的节点，将差异的属性更新）
    // 3、节点比较完毕后就需要比较两人的儿子

    return patchVNode(oldVNode, vnode);
  }
}
```

在判断是不是文本节点，如果oldVNode没有tag属性则为文本节点，新文本和老文本不一致直接替换。走过是否是相同节点，是否是文本节点后，如果是相同节点不是文本节点，则要继续判断属性，调用patchProps方法。修改一下之前的patchProps方法，需要传入老节点data
```
function patchVNode(oldVNode, vnode) {
  if (!isSameVNode(oldVNode, vnode)) {
    // 1、两个节点不是同一个节点，直接删除老的换上新的（没有比对了）
    // 用老节点的父亲 进行替换
    let el = createElm(vnode);
    oldVNode.el.parentNode.replaceChild(el, oldVNode.el);
    return el;
  }

  // 文本的情况 期望比较一下文本的内容
  let el = (vnode.el = oldVNode.el);
  if (!oldVNode.tag) {
    // 是文本
    if (!oldVNode.text === vnode.text) {
      el.textContent = vnode.text;
    }
  }

  // 是相同标签 是标签需要比对标签的属性
  patchProps(el, oldVNode.data, vnode.data);
  return el;
}
```
```
export function patchProps(el, oldProps, props) {
  for (let key in props) {
    // 用新的覆盖掉老的
    if (key === "style") {
      for (let styleName in props.style) {
        el.style[styleName] = props.style[styleName];
      }
    } else {
      el.setAttribute(key, props[key]);
    }
  }
}
```
比对属性，老的属性中有 新的没有 要删除老的
```
export function patchProps(el, oldProps, props) {
  // 老的属性中有 新的没有 要删除老的
  let oldStyles = oldProps.style || {};
  let newStyles = props.style || {};
  for (let key in oldStyles) {
    // 老的样式中有 新的没有则删除
    if (!newStyles[key]) {
      el.style[key] = "";
    }
  }

  for (let key in oldProps) {
    // 老的属性中有 新的没有则移除属性
    if (!props[key]) {
      el.removeAttribute(key);
    }
  }

  for (let key in props) {
    // 用新的覆盖掉老的
    if (key === "style") {
      for (let styleName in props.style) {
        el.style[styleName] = props.style[styleName];
      }
    } else {
      el.setAttribute(key, props[key]);
    }
  }
}
```
比对完属性了就需要比对儿子了。
1. 比较儿子节点 一方有儿子 一方没儿子
2. 两方都有儿子
如果oldChildren和newChildren都有值，需要完整比较，先一放，先比较简单的，如果新的没有，老的有则直接删除；如果新的有，老的没有，新建挂载儿子的方法。
```
function patchVNode(oldVNode, vnode) {
  if (!isSameVNode(oldVNode, vnode)) {
    // 1、两个节点不是同一个节点，直接删除老的换上新的（没有比对了）
    // 用老节点的父亲 进行替换
    let el = createElm(vnode);
    oldVNode.el.parentNode.replaceChild(el, oldVNode.el);
    return el;
  }

  // 文本的情况 期望比较一下文本的内容
  let el = (vnode.el = oldVNode.el);
  if (!oldVNode.tag) {
    // 是文本
    if (!oldVNode.text === vnode.text) {
      el.textContent = vnode.text;
    }
  }

  // 是相同标签 是标签需要比对标签的属性
  patchProps(el, oldVNode.data, vnode.data);

  // 比较儿子节点 一方有儿子 一方没儿子
  // 两方都有儿子
  let oldChildren = oldVNode.children || [];
  let newChildren = vnode.children || [];

  if (oldChildren.length > 0 && newChildren.length > 0) {
    // 需要比较两个人的儿子
    updateChildren(el, oldChildren, newChildren);
  } else if (newChildren.length > 0) {
    // 没有老的 有新的
    mountChildren(el, newChildren);
  } else if (oldChildren.length > 0) {
    // 新的没有 有老的 老的要删除
    el.innerHTML = "";
  }

  return el;
}
```
```
function mountChildren(el, newChildren) {
  for (let i = 0; i < newChildren.length; i++) {
    let child = newChildren[i];
    el.appendChild(createElm(child));
  }
}
```
剩下两个儿子都有的情况，新建updateChildren方法。采用双指针的方式，从头开始比对，老的新建两个指针，指向老的头尾，新的新建两个指针，指向新的首尾，循环判断，不管是老儿子和新儿子的收尾指针越界就停止循环。
```
function updateChildren(el, oldChildren, newChildren) {
  // 为了比较两个儿子的时候 为了增高性能 需要一些优化方法
  // 经常是会有 pop push shift unshift reverse sort splice
  // vue2中采用双指针的方式 比较两个节点

  let oldStartIndex = 0;
  let newStartIndex = 0;
  let oldEndIndex = oldChildren.length - 1;
  let newEndIndex = newChildren.length - 1;

  let oldStartVNode = oldChildren[0];
  let newStartVNode = newChildren[0];

  let oldEndVNode = oldChildren[oldEndIndex];
  let newEndVNode = newChildren[newEndIndex];

  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    // 有任何一个不满足就停止
    // 双方有一方头指针 大于尾部指针则停止循环
  }
}
```

## 十七、实现完整的diff算法
接上一段，开始比较儿子，已经拿到了新老的头尾index和vnode，有几种特殊的情况先判断。
1. 从头指针开始往后比
2. 从尾指针开始往前比
3. 交叉比老尾和新头比
4. 交叉比老头和新尾比
5. 乱序比
1，2,先用isSameVNode方法判断两个节点是不是相同，是则进入判断调用patchVNode比较属性等递归比较，比较完之后移动指针。知道新的或者老的头指针和尾指针跳出这个循环条件oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex。如果newStartIndex <= newEndIndex说明新的多了，循环这两个指针之间的，添加一个属性标志位，如果新的尾指针下一个有值，则表明往前插入，否则往后插入。insertBefore方法如果第二个参数是null则默认往后插入。
```
if (isSameVNode(oldStartVNode, newStartVNode)) {
   // 如果是相同节点，则递归比较子节点
   patchVNode(oldStartVNode, newStartVNode);
   oldStartVNode = oldChildren[++oldStartIndex];
   newStartVNode = newChildren[++newStartIndex];
   // 比较开头节点
} else if (isSameVNode(oldEndVNode, newEndVNode)) {
   // 从尾指针往前比
   patchVNode(oldEndVNode, newEndVNode);
   oldEndVNode = oldChildren[--oldEndIndex];
   newEndVNode = newChildren[--newEndIndex];
}
```
```
// 新的多的就插入进去
if (newStartIndex <= newEndIndex) {
 for (let i = newStartIndex; i <= newEndIndex; i++) {
   let childEl = createElm(newChildren[i]);
   // 这里可能是向后追加，也可能是向前追加
   // el.appendChild(childEl);
   let anchor = newChildren[newEndIndex + 1]
     ? newChildren[newEndIndex + 1].el
     : null; // 获取下一个元素
   el.insertBefore(childEl, anchor);
   // 如果insertBefore第二个参数是null，则会插入到最后
 }
}

// 老的多的就删掉
if (oldStartIndex <= oldEndIndex) {
 for (let i = oldStartIndex; i <= oldEndIndex; i++) {
   if (oldChildren[i]) {
     let childEl = oldChildren[i].el;
     el.removeChild(childEl);
   }
 }
}
```
3，4交叉比对，老的尾和新的头比较，如果一致则老的插入到老的头指针之前，继续比对；老的头和新的尾比较，如果一致则老的头插入到老的尾指针之后，继续比对。
```
else if (isSameVNode(oldEndVNode, newStartVNode)) {
   // 交叉比对 老尾和新头比较
   patchVNode(oldEndVNode, newStartVNode);
   // insertBefore 具有移动性 会将原来的元素移动走
   el.insertBefore(oldEndVNode.el, oldStartVNode.el); // 将老的尾巴移动到前面去
   oldEndVNode = oldChildren[--oldEndIndex];
   newStartVNode = newChildren[++newStartIndex];
 } else if (isSameVNode(oldStartVNode, newEndVNode)) {
   // 交叉比对 老头和新尾比较
   patchVNode(oldStartVNode, newEndVNode);
   // insertBefore 具有移动性 会将原来的元素移动走
   el.insertBefore(oldStartVNode.el, oldEndVNode.el.nextSibling); // 将老的尾巴移动到前面去
   oldStartVNode = oldChildren[++oldStartVNode];
   newEndVNode = newChildren[--newEndVNode];
 }
```
5,乱序比对，将老的循环成一个map键值对，key就是节点的key，value就是循环的index。新建方法makeIndexByKey实现此功能。
```
function makeIndexByKey(children) {
 let map = {};
 children.forEach((child, index) => {
   map[child.key] = index;
 });
 return map;
}

let map = makeIndexByKey(oldChildren);
```
得到老的键值对后，开始从新的头指针比对，如果拿着头指针对应的在老的map里面找到了，则将老的移动到老的头指针之前，原来老的位置置为undefined，如果比对不到则将新的放到老的头指针之前
```
else {
   // 乱序比对
   // 根据老的列表做一个映射关系 用新的去找，找到则移动，找不到则添加， 最后多余的就删除

   let moveIndex = map[newStartVNode.key]; // 如果拿到则说明是我要移动的索引
   if (moveIndex !== undefined) {
     let moveVNode = oldChildren[moveIndex]; // 找到对应的虚拟节点 复用

     el.insertBefore(moveVNode.el, oldStartVNode.el);

     oldChildren[moveIndex] = undefined; // 表示这个节点已经移动走了
     patchVNode(moveVNode, newStartVNode);
   } else {
     el.insertBefore(createElm(newStartVNode), oldStartVNode.el);
   }

   newStartVNode = newChildren[++newStartIndex];
 }
```

## 十八、实现组件的虚拟节点
diff算法结束后，到lifecycle.js中判断走diff算法还是初次渲染。将vnode保存早vm._vnode上，进入_update判断vm._vnode有没有，没有就是初次渲染，有就走diff算法，将之前的虚拟节点和新的虚拟节点传入。
```
const prevVNode = vm._vnode;
vm._vnode = vnode; // 把组件第一次产生的虚拟节点保存到_vnode上
if(prevVNode) {
  vm.$el = patch(prevVNode, vnode);
}else {
  vm.$el = patch(el, vnode);
}
```
开始实现组件的虚拟节点。

组件的三大特性
- 自定义标签
- 组件里面有自己的属性和事件
- 组件的插槽(webcomponent)
声明组件，有全局组件和局部组件
```
Vue.component('my-button', Vue.extend({
  template: '<button>全局button</button>'
}))
```
```
const vm = new Vue({
  el: '#app',
  data() {
    return {
      name: 'yiyiyi'
    }
  },
  components: {
    'my-button': Vue.extend({
      template: '<button>打我</button>'
    })
  }
})
```
组件内部是一个继承的模型。使用Vue.extend和直接写一个对象相同效果，内部会调Vue.extend这个api。
```
let Sub = Vue.extend({
  template: '<div>子组件 <my-button></my-button> </div>',
  // components: {
  //   'my-button': {
  //     template: '<button>内部的button</button>'
  //   }
  // }
})
new Sub().$mount('#root');
```
在globalApi.js中先实现Vue.extend这个api，会返回一个sub子类。最终使用一个组件 就是new一个实例。这个类没有$mount,所以用这个类继承Vue，复用原型，但是是独立的，所以用Object.create()。将用户传递的选项存起来。sub要默认对子类初始化，所以调用Vue的_init方法。但是prototype指向Vue.prototype之后Sub.prototype.constructor就是Vue了，这样拿不到用户传入的选项，所以constructor要重新指回Sub
```
Vue.extend = function(options) {
  // 就是实现根据用户的参数 返回一个构造函数
  function Sub(options = {}) { // 最终使用一个组件 就是new一个实例
    this._init(options ); // 就是默认对子类进行初始化操作
  }

  Sub.prototype = Object.create(Vue.prototype);
  Sub.prototype.constructor = Sub;
  Sub.options = mergeOptions(Vue.options, options); // 保存用户传递的选项

  return Sub;
}
```
在globalApi.js中再实现一下Vue.component,接收组件名和定义。如果用户传入的定义不是Vue.extend函数，而是一个对象，判断一下调用Vue.extend。最后挂载到Vue.options.components上。
```
Vue.options.components = {};
Vue.component = function(id, definition) {

  // 如果definition已经是一个函数了 说明用户自己调用了Vue.extend
  definition = typeof definition === 'function' ? definition : Vue.extend(definition);

  Vue.options.components[id] = definition;
  console.log(Vue.options.components)
}
```
在处理用户传入的局部组件时，应该自己也有一个components属性，还应该找到父亲的组件。所以组件的options挂载时要和Vue的选项合并一下。
```
Sub.options = mergeOptions(Vue.options, options); // 保存用户传递的选项
```
然后处理mergeOptions方法要处理组件的渲染流程，到util.js中新建策略
```
strats.components = function(parentVal, childVal) {
  const res = Object.create(parentVal);

  if(childVal) {
    for(let key in childVal) {
      res[key] = childVal[key]; // 返回的是构造的对象 可以拿到父亲原型上的属性 并且将儿子的都拷贝到自己身上
    }
  }

  return res;
}
```
解析模版的时候怎么知道是标签是组件呢，到vdom/index.js中判断原始标签,新增判断是否原始标签方法，到createElementVNode判断tag是否是组件，是组件就创建一个组件的虚拟节点(包含组件的构造函数)，新增创建组件虚拟节点方法createComponentVNode
```
const isReservedTag = (tag) => {
  return ["a", "div", "span", "p", "button", "ul", "li"].includes(tag);
};
```
```
// h() _c()
export function createElementVNode(vm, tag, data, ...children) {
  if (data == null) {
    data = {};
  }
  let key = data.key;
  if (key) {
    delete data.key;
  }
  if (isReservedTag(tag)) {
    return vnode(vm, tag, key, data, children);
  } else {
    // 创造一个组件的虚拟节点（包含组件的构造函数）
    let Ctor = vm.$options.components[tag];

    // Ctor就是组件的定义 可能是一个Sub类 还有可能是组件的obj选项
    return createComponentVNode(vm, tag, key, data, children, Ctor);
  }
}
```
```
function createComponentVNode(vm, tag, key, data, children, Ctor) {
  if (typeof Ctor === "object") {
    Ctor = vm.$options._base.extend(Ctor);
  }
  // 稍后创建真实节点的时候 如果是组件则调用此init方法
  data.hook = {
    init() {
      
    }
  }
  return vnode(vm, tag, key, data, children, null, { Ctor });
}
```
## 十九、实现组件的渲染流程