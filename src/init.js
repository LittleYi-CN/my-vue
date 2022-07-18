import { compileToFunction } from "./compile";
import { callHook, mountComponent } from "./lifeCycle";
import { initState } from "./state";
import { mergeOptions } from "./util";

export function initMixin(Vue) { // 给Vue增加init方法的
  Vue.prototype._init = function(options) { // 用于初始化操作
    // Vue $options 就是获取用户的配置
    const vm = this;
    vm.$options = mergeOptions(this.constructor.options, options); // 将用户的选项挂载在实例上

    callHook(vm, 'beforeCreate')
    // 初始化状态, 初始化计算属性， watch
    initState(vm);
    callHook(vm, 'created')

    if(options.el) {
      vm.$mount(options.el); // 实现数据的挂载
    }
  }

  Vue.prototype.$mount = function(el) {
    const vm = this;
    el = document.querySelector(el);
    let ops = vm.$options;
    if(!ops.render) { // 先进行查找有没有render函数
      let template;   // 没有render看一下是否写了template，没写template采用外部的template
      if(!ops.template && el) { // 没有写模版，但是写了el
        template = el.outerHTML;
      } else {
        if(el) {
          template = ops.template;
        }
      }
      // 写了template 就用写了的template
      if(template) {
        // 这里需要对模版进行编译
        const render = compileToFunction(template);
        ops.render = render;
      }
    }

    mountComponent(vm, el); // 组件的挂载
    // 最终就可以获取render方法
  }
}
