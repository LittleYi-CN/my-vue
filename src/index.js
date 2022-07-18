import { initGlobalAPI } from "./globalApi";
import { initMixin } from "./init";
import { initLifecycle } from "./lifeCycle";
import Watcher, { nextTick } from "./observe/watcher";

function Vue(options) {
  this._init(options);
}

Vue.prototype.$nextTick = nextTick;

initMixin(Vue); // 扩展了init方法
initLifecycle(Vue);

initGlobalAPI(Vue);

// 最终调用的都是这个方法
Vue.prototype.$watch = function (exprOrFn, cb, options = {}) {
  new Watcher(this, exprOrFn, { user: true }, cb);
};

export default Vue;
