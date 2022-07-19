import { compileToFunction } from "./compile";
import { initGlobalAPI } from "./globalApi";
import { initMixin } from "./init";
import { initLifecycle } from "./lifeCycle";
import { initStateMixin } from "./state";
import { createElm, patch } from "./vdom/patch";

function Vue(options) {
  this._init(options);
}

initMixin(Vue); // 扩展了init方法
initLifecycle(Vue); // vm._update vm._render

initGlobalAPI(Vue); // 全局api的实现

initStateMixin(Vue); // 实现了nextTick $watch

// ---------------- 方便观察前后的虚拟节点 ----------------------

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


export default Vue;
