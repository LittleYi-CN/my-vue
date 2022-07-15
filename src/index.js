import { initMixin } from './init'
import { initLifecycle } from './lifeCycle';

function Vue(options) {
  this._init(options)
}

initMixin(Vue); // 扩展了init方法
initLifecycle(Vue);

export default Vue