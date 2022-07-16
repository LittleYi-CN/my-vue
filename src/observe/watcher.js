import Dep from "./dep";

let id = 0;

// 1、当创建渲染watcher时会把当前的渲染watcher放到Dep.target上
// 2、调用_render()时会取值 走到get上

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

// 需要给每个属性增加一个dep，目的就是收集watcher

// 一个组件中 有多少个属性（n个属性会对应一个组件） n个dep对应一个watcher
// 一个属性会对应多个组件 一个dep对应多个watcher
// 多对多的关系

export default Watcher;