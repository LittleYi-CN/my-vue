import { mergeOptions } from "./util";

export function initGlobalAPI(Vue) {
  Vue.options = {
    _base: Vue
  };

  // 静态方法
  Vue.mixin = function (mixin) {
    // 期望将用户的选项和全局的options进行合并
    this.options = mergeOptions(this.options, mixin);
    return this;
  };

  Vue.extend = function(options) {
    // 就是实现根据用户的参数 返回一个构造函数
    function Sub(options = {}) { // 最终使用一个组件 就是new一个实例
      this._init(options ); // 就是默认对子类进行初始化操作
    }

    Sub.prototype = Object.create(Vue.prototype);
    Sub.prototype.constructor = Sub;
    Sub.options = mergeOptions(Vue.options, options); // 保存用户传递的选项

    return Sub;
  }

  Vue.options.components = {};

  Vue.component = function(id, definition) {

    // 如果definition已经是一个函数了 说明用户自己调用了Vue.extend
    definition = typeof definition === 'function' ? definition : Vue.extend(definition);

    Vue.options.components[id] = definition;
    console.log(Vue.options.components)
  }
}
