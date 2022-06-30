class Observer {
  constructor(data) {
    // Object.defineProperty 只能劫持已经存在的属性（vue里面会为此单独写一些api $set $delete）
    this.walk(data);
  }

  walk(data) { // 循环对象，对属性依次劫持
    // 重新定义属性
    Object.keys(data).forEach(key => defineReactive(data, key, data[key]));
  }
}

export function defineReactive(target, key, value) { // 闭包 属性劫持
  observe(value); // 对所有的对象都进行属性劫持
  Object.defineProperty(target, key, {
    get() { // 取值的时候会执行get
      return value;
    },
    set(newValue) { // 修改的时候会执行set
      if(newValue === value) return;
      value = newValue
    }
  })
}

export function observe(data) {
  // 对这个对象进行劫持
  if(typeof data !== 'object' || data == null) {
    return; // 只对对象进行劫持
  }

  // 如果一个对象被劫持过了，那就不需要再被劫持了（要判断 一个对象是否被劫持过，可以增添一个实例，用实例来判断是否被劫持过）

  return new Observer(data);
}