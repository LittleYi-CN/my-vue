const isReservedTag = (tag) => {
  return ["a", "div", "span", "p", "button", "ul", "li"].includes(tag);
};

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

// _v()
export function createTextVNode(vm, text) {
  return vnode(vm, undefined, undefined, undefined, undefined, text);
}

function vnode(vm, tag, key, data, children, text, componentOptions) {
  return {
    vm,
    tag,
    key,
    data,
    children,
    text,
    componentOptions, // 组件的构造函数
  };
}

export function isSameVNode(vNode1, vNode2) {
  return vNode1.tag === vNode2.tag && vNode1.key === vNode2.key;
}
