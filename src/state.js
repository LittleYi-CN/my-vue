export function initState(vm) {
  const ops = vm.$options; //获取所有的选项
  if(ops.data) {
    initData(vm);
  }
}

function initData(vm) {
  let data = vm.$options.data; // data可能是函数也可能是对象

  data = typeof data === 'function' ? data.call(vm) : data;
  debugger;
  console.log(data)
}