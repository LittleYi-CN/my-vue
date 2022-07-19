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

export function isSameVNode(vNode1, vNode2) {
  return vNode1.tag === vNode2.tag && vNode1.key === vNode2.key;
}