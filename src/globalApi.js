import { mergeOptions } from "./util";

export function initGlobalAPI(Vue) {
  Vue.options = {};

  // 静态方法
  Vue.mixin = function (mixin) {
    // 期望将用户的选项和全局的options进行合并
    this.options = mergeOptions(this.options, mixin);
    return this;
  };
}
