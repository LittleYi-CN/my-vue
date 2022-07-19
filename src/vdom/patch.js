import { isSameVNode } from ".";

export function createElm(vnode) {
  let { tag, data, children, text } = vnode;
  if (typeof tag === "string") {
    vnode.el = document.createElement(tag); // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了，可以直接找到虚拟节点上挂载的真实节点修改

    patchProps(vnode.el, {}, data);

    children.forEach((child) => {
      vnode.el.appendChild(createElm(child));
    });
  } else {
    vnode.el = document.createTextNode(text);
  }

  return vnode.el;
}

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

function mountChildren(el, newChildren) {
  for (let i = 0; i < newChildren.length; i++) {
    let child = newChildren[i];
    el.appendChild(createElm(child));
  }
}

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
  console.log(oldStartVNode);
  console.log(newStartVNode);
  console.log(oldEndVNode);
  console.log(newEndVNode);
}