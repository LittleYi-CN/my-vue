// rollup默认可以导出一个对象 作为打包的配置文件
import babel from 'rollup-plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
export default {
   input: './src/index.js', // 入口
   output: {
    file: './dist/vue.js', // 出口
    name: 'Vue', // global.Vue
    format: 'umd', // esm es6模块 commonjs模块 IIFE自执行函数 umd（commonjs, amd）
    sourcemap: true, // 希望可以调试源代码
   },
   plugins: [
    babel({
      exclude: 'node-modules/**' // 排除node_modules所有文件
    }),
    resolve()
   ]
}