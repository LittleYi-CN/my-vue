import { initMixin } from './init'

function Vue(options) {
  this._init(options)
}

initMixin(Vue); // 扩展了init方法

export default Vue