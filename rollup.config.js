import svelte from 'rollup-plugin-svelte'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'

const now = new Date()

const plugins = [
	commonjs(),
	replace({
		preventAssignment: true,
		values: {
			__DEPLOY_TIME__: `${now.getHours()}:${now.getMinutes()}.${now.getMilliseconds()}`
		}
	}),
	svelte({
		emitCss: false,
		compilerOptions: {
			generate: 'ssr',
		},
	}),
	nodeResolve({
		exportConditions: [ 'browser', 'worker' ],
		browser: true,
	}),
]

export default {
	input: 'src/index.js',
	output: {
		exports: 'named',
		file: 'dist/index.mjs',
		format: 'es',
		sourcemap: true,
	},
	plugins,
}
