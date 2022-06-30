import { observe } from "./observe/index";

export function initState(vm) {
  const ops = vm.$options; //获取所有的选项
  if(ops.data) {
    initData(vm);
  }
}

function proxy(vm, target, key) {
  Object.defineProperty(vm, key ,{
    get() {
      return vm[target][key];
    },
    set(newValue) {
      vm[target][key] = newValue;
    }
  })
}

function initData(vm) {
  let data = vm.$options.data; // data可能是函数也可能是对象

  data = typeof data === 'function' ? data.call(vm) : data; // data 是用户返回的对象

  vm._data = data; // 将返回的对象放到了_data 上
  // 对数据进行劫持 vue2采用了一个api defineProperty
  observe(data);

  // 将vm._data 用vm来代理就可以了
  for(let key in data) {
    proxy(vm, '_data', key);
  }
}