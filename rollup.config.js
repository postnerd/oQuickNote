import svelte from "rollup-plugin-svelte";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
//import css from "rollup-plugin-css-only";
import copy from "rollup-plugin-copy";
import html from "@rollup/plugin-html";

const production = !process.env.ROLLUP_WATCH;

/**
 * Fix for not bundling the css file in watchMode after changing a svelte file, if no style was changed.
 * Should only be here as long as there is no fix in the original rollup-plugin-css-only (https://github.com/thgh/rollup-plugin-css-only/pull/37)
 */
function cssForcedBuild(options) {
	if ( options === void 0 ) options = {};
  
	var filter = require("@rollup/pluginutils").createFilter(options.include || ['**/*.css'], options.exclude);
	var styles = {};
	var order = [];
	var dest = options.output;
	var changes = 0;
  
	return {
	  name: 'css',
	  transform: function transform(code, id) {
		if (!filter(id)) {
		  return
		}
  
		// When output is disabled, the stylesheet is exported as a string
		if (options.output === false) {
		  return {
			code: 'export default ' + JSON.stringify(code),
			map: { mappings: '' }
		  }
		}
  
		// Track the order that each stylesheet is imported.
		if (!order.includes(id)) {
		  order.push(id);
		}
  
		// Keep track of every stylesheet
		// Check if it changed since last render
		if (styles[id] !== code && (styles[id] || code)) {
		  styles[id] = code;
		  changes++;
		}
  
		return ''
	  },
	  generateBundle: function generateBundle(opts, bundle) {
		// No stylesheet needed
		if ((!changes || options.output === false) && options.forceBuild === false) {
		  return
		}
		changes = 0;
  
		// Combine all stylesheets, respecting import order
		var css = '';
		for (var x = 0; x < order.length; x++) {
		  var id = order[x];
		  css += styles[id] || '';
		}
  
		// Emit styles through callback
		if (typeof options.output === 'function') {
		  options.output(css, styles, bundle);
		  return
		}
  
		if (typeof dest !== 'string') {
		  // Don't create unwanted empty stylesheets
		  if (!css.length) {
			return
		  }
  
		  // Guess destination filename
		  dest =
			opts.file ||
			(Array.isArray(opts.output)
			  ? opts.output[0].file
			  : opts.output && opts.output.file) ||
			opts.dest ||
			'bundle.js';
		  if (dest.endsWith('.js')) {
			dest = dest.slice(0, -3);
		  }
		  dest = dest + '.css';
		}
  
		// Emit styles to file
		this.emitFile({ type: 'asset', fileName: dest, source: css });
	  }
	}
  }

export default [
	{
		input: "src/main.js",
		output: {
			sourcemap: true,
			format: "cjs",
			exports: "auto",
			file: "app/main/main.js"
		},
		plugins: [
			// // If you have external dependencies installed from
			// // npm, you"ll most likely need these plugins. In
			// // some cases you"ll need additional configuration -
			// // consult the documentation for details:
			// // https://github.com/rollup/plugins/tree/master/packages/commonjs
			resolve(),
			commonjs({
				ignoreGlobal: true,
				ignore: ["electron", "path", "fs"]
			}),
			copy({
				targets: [
					{
						src: "assets/icons/**/*", dest: "app/icons",
					},
					{
						src: "src/package.json", dest: "app"
					}
				]	
			}),
			// If we"re building for production (npm run build
			// instead of npm run dev), minify
			production && terser()
		],
		watch: {
			clearScreen: false
		}
	},
	{
		input: "src/api/editorAPI.js",
		output: {
			sourcemap: true,
			format: "cjs",
			exports: "auto",
			file: "app/renderer/editor/editorAPI.js"
		},
		plugins: [
			// // If you have external dependencies installed from
			// // npm, you"ll most likely need these plugins. In
			// // some cases you"ll need additional configuration -
			// // consult the documentation for details:
			// // https://github.com/rollup/plugins/tree/master/packages/commonjs
			resolve(),
			commonjs({
				ignoreGlobal: true,
				ignore: ["electron"]
			}),
			// If we"re building for production (npm run build
			// instead of npm run dev), minify
			production && terser()
		],
		watch: {
			clearScreen: false
		}
	},
	{
		input: "src/api/settingsAPI.js",
		output: {
			sourcemap: true,
			format: "cjs",
			exports: "auto",
			file: "app/renderer/settings/settingsAPI.js"
		},
		plugins: [
			// // If you have external dependencies installed from
			// // npm, you"ll most likely need these plugins. In
			// // some cases you"ll need additional configuration -
			// // consult the documentation for details:
			// // https://github.com/rollup/plugins/tree/master/packages/commonjs
			resolve(),
			commonjs({
				ignoreGlobal: true,
				ignore: ["electron"]
			}),
			// If we"re building for production (npm run build
			// instead of npm run dev), minify
			production && terser()
		],
		watch: {
			clearScreen: false
		}
	},
	{
		input: "src/view/editor/index.js",
		output: {
			sourcemap: true,
			format: "iife",
			name: "editor",
			file: "app/renderer/editor/editor.js"
		},
		plugins: [
			svelte({
				compilerOptions: {
					// enable run-time checks when not in production
					dev: !production
				}
			}),
			// we"ll extract any component CSS out into
			// a separate file - better for performance
			cssForcedBuild({ output: "editor.css", forceBuild: true }),
			// If you have external dependencies installed from
			// npm, you"ll most likely need these plugins. In
			// some cases you"ll need additional configuration -
			// consult the documentation for details:
			// https://github.com/rollup/plugins/tree/master/packages/commonjs
			resolve({
				browser: true,
				dedupe: ["svelte"]
			}),
			commonjs(),
			html({
				fileName: "editor.html",
				title: production ? "oQuickNote" : "oQuickNoteDEV",
				meta: [
					{charset: "utf-8"},
					{name: "viewport", content: "width=device-width,initial-scale=1"},
					{"http-equiv": "Content-Security-Policy", content: "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';"}
				]
			}),
			production && terser()
		],
		watch: {
			clearScreen: false
		}
	},
	{
		input: "src/view/settings/index.js",
		output: {
			sourcemap: true,
			format: "iife",
			name: "settings",
			file: "app/renderer/settings/settings.js"
		},
		plugins: [
			svelte({
				compilerOptions: {
					// enable run-time checks when not in production
					dev: !production
				}
			}),
			// we"ll extract any component CSS out into
			// a separate file - better for performance
			cssForcedBuild({ output: "editor.css", forceBuild: true }),
			// If you have external dependencies installed from
			// npm, you"ll most likely need these plugins. In
			// some cases you"ll need additional configuration -
			// consult the documentation for details:
			// https://github.com/rollup/plugins/tree/master/packages/commonjs
			resolve({
				browser: true,
				dedupe: ["svelte"]
			}),
			commonjs(),
			html({
				fileName: "settings.html",
				title: production ? "oQuickNote" : "oQuickNoteDEV",
				meta: [
					{charset: "utf-8"},
					{name: "viewport", content: "width=device-width,initial-scale=1"},
					{"http-equiv": "Content-Security-Policy", content: "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';"}
				]
			}),
			production && terser()
		],
		watch: {
			clearScreen: false
		}
	}
];
