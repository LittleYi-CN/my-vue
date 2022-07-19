import Dep from "./observe/dep";
import { observe } from "./observe/index";
import Watcher, { nextTick } from "./observe/watcher";

export function initState(vm) {
  const ops = vm.$options; //获取所有的选项
  if (ops.data) {
    initData(vm);
  }
  if (ops.computed) {
    initComputed(vm);
  }
  if (ops.watch) {
    initWatch(vm);
  }
}

function proxy(vm, target, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[target][key];
    },
    set(newValue) {
      vm[target][key] = newValue;
    },
  });
}

function initData(vm) {
  let data = vm.$options.data; // data可能是函数也可能是对象

  data = typeof data === "function" ? data.call(vm) : data; // data 是用户返回的对象

  vm._data = data; // 将返回的对象放到了_data 上
  // 对数据进行劫持 vue2采用了一个api defineProperty
  observe(data);

  // 将vm._data 用vm来代理就可以了
  for (let key in data) {
    proxy(vm, "_data", key);
  }
}

function initComputed(vm) {
  const computed = vm.$options.computed;
  const watchers = (vm._computedWatchers = []);
  for (let key in computed) {
    let userDef = computed[key];
    let fn = typeof userDef === "function" ? userDef : userDef.get;
    // 需要监控计算属性中get的变化
    // 如果直接new Watcher() 就会默认执行fn, 将属性和watcher对应起来
    watchers[key] = new Watcher(vm, fn, { lazy: true });

    defineComputed(vm, key, userDef);
  }
}

function defineComputed(target, key, userDef) {
  const getter = typeof userDef === "function" ? userDef : userDef.get;
  const setter = userDef.set || (() => {});
  Object.defineProperty(target, key, {
    get: createComputedGetter(key),
    set: setter,
  });
}

// 计算属性根本不会收集依赖 只会让自己的依赖属性去收集依赖
function createComputedGetter(key) {
  // 需要检测是否要执行这个getter
  return function () {
    const watcher = this._computedWatchers[key]; // 获取到对应属性的watcher
    if (watcher.dirty) {
      watcher.evaluate(); // 求值后 dirty变为false， 下次就不求值了
    }
    if (Dep.target) {
      // 计算属性出栈后 还要渲染watcher 应该让计算属性watcher里面的属性 也去收集上层watcher
      watcher.depend();
    }
    return watcher.value; // 最后返回的是watcher上的值
  };
}

function initWatch(vm) {
  let watch = vm.$options.watch;

  for (let key in watch) {
    // 字符串 数组 函数
    const handler = watch[key];
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, key, handler) {
  // 字符串 函数
  if (typeof handler === "string") {
    handler = vm[handler];
  }
  return vm.$watch(key, handler);
}

export function initStateMixin(Vue) {
  Vue.prototype.$nextTick = nextTick;

  // 最终调用的都是这个方法
  Vue.prototype.$watch = function (exprOrFn, cb, options = {}) {
    new Watcher(this, exprOrFn, { user: true }, cb);
  };
}
