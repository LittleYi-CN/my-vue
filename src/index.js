import { initGlobalAPI } from "./globalApi";
import { initMixin } from "./init";
import { initLifecycle } from "./lifeCycle";
import { nextTick } from "./observe/watcher";

function Vue(options) {
  this._init(options);
}

Vue.prototype.$nextTick = nextTick;

initMixin(Vue); // 扩展了init方法
initLifecycle(Vue);

initGlobalAPI(Vue);

export default Vue;
