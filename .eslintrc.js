module.exports = {
	"env": {
		"browser": true,
		"node": true
	},
	"plugins": [
		"svelte3"
	],
	"overrides": [
		{
			"files": ["*.svelte"],
			"processor": "svelte3/svelte3"
		}
	],
	"extends": "eslint:recommended",
	"parserOptions": {
		"ecmaVersion": "latest",
		"sourceType": "module"
	},
	"rules": {
		"indent": [
			"error",
			"tab"
		],
		"quotes": [
			"error",
			"double"
		],
		"semi": [
			"error",
			"always"
		],
		"curly": [
			"error",
			"all"
		],
		"no-trailing-spaces": [
			"error",
			{
				"ignoreComments": true
			}
		]
	}
};
