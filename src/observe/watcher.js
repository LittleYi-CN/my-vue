import Dep from "./dep";

let id = 0;

// 1、当创建渲染watcher时会把当前的渲染watcher放到Dep.target上
// 2、调用_render()时会取值 走到get上

class Watcher {
  // 不同组件有不同的watcher
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

  addDep(dep) {
    // 一个组件对应多个属性 重复的属性也不用记录
    let id = dep.id;
    if (!this.depsId.has(id)) {
      this.deps.push(dep);
      this.depsId.add(id);
      dep.addSub(this);
    }
  }

  update() {
    queueWatcher(this); // 吧当前的watcher暂存起来
    // this.get();
  }

  run() {
    this.get(); // 渲染的时候用的是最新的vm来渲染的
  }
}

let queue = [];
let has = {};
let pending = false; // 防抖

function flushSchedulerQueue() {
  let flushQueue = queue.slice(0);
  queue = [];
  has = {};
  pending = false;
  flushQueue.forEach((q) => q.run()); // 在刷新的过程中，可能还有新的watcher，重新放到queue中
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

let callbacks = [];
let waiting = false;

function flushCallbacks() {
  waiting = false;
  let cbs = callbacks.slice(0);
  callbacks = [];
  cbs.forEach((cb) => cb());
}
// nexttick中没有直接使用某个api 而是采用优雅降级的方式
// 内部先采用promise（ie不兼容）MutationObserver（h5） setImmediate setTimeout

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

// 需要给每个属性增加一个dep，目的就是收集watcher

// 一个组件中 有多少个属性（n个属性会对应一个组件） n个dep对应一个watcher
// 一个属性会对应多个组件 一个dep对应多个watcher
// 多对多的关系

export default Watcher;
