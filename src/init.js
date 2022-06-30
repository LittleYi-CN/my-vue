import { initState } from "./state";

export function initMixin(Vue) { // 给Vue增加init方法的
  Vue.prototype._init = function(options) { // 用于初始化操作
    // Vue $options 就是获取用户的配置
    const vm = this;
    vm.$options = options; // 将用户的选项挂载在实例上

    // 初始化状态
    initState(vm);
  }
}
