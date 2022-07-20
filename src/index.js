import { compileToFunction } from "./compile";
import { initGlobalAPI } from "./globalApi";
import { initMixin } from "./init";
import { initLifecycle } from "./lifeCycle";
import { initStateMixin } from "./state";

function Vue(options) {
  this._init(options);
}

initMixin(Vue); // 扩展了init方法
initLifecycle(Vue); // vm._update vm._render
initGlobalAPI(Vue); // 全局api的实现
initStateMixin(Vue); // 实现了nextTick $watch

export default Vue;
