let id = 0;

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

Dep.target = null;

let stack = [];
export function pushTarget(watcher) {
  stack.push(watcher);
  Dep.target = watcher;
}

export function popTarget() {
  stack.pop();
  Dep.target = stack[stack.length - 1];
}

export default Dep;
