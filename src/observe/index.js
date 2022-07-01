import { newArrayProto } from "./array";

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