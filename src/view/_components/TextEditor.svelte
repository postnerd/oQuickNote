<script>
	import { EditorState, basicSetup } from "@codemirror/basic-setup";
	import { EditorView, keymap } from "@codemirror/view";
	import { markdown } from "@codemirror/lang-markdown";
	import { Compartment } from "@codemirror/state";
	import { indentWithTab } from "@codemirror/commands";
	import { oneDark } from "@codemirror/theme-one-dark";
	import { onMount } from "svelte";

	export let doc; // holds information about the note content
	export let contentHeight; // height of the note content

	// Will be used after saving a note to delete the current note content 
	export const resetEditor = () => {
		let transaction = editorView.state.update({changes: {from: 0, to: editorView.state.doc.length, insert: ""}});
		editorView.dispatch(transaction);
	}

	// Using css information to determine if the browser window is used in dark mode
	const themeInformation = window.matchMedia("(prefers-color-scheme: dark)");
	let darkMode = themeInformation.matches;

	let editorView; // holds the codemirror EditorView instance
	let darkThemeCompartment = new Compartment(); // to dynamically reconfigurate the codemirror editor we have to use the compartement module
	
	// Whatches if the user changed the theme setting during runtime
	themeInformation.onchange = (themeInfo) => {
		darkMode = themeInfo.matches;
		editorView.dispatch({
			effects: darkThemeCompartment.reconfigure(darkMode ? oneDark : [])
		});
	};

	// Will update props for the main editor component every time the content or the editor view changes
	const updateHandler = EditorView.updateListener.of((event) => {
		if (event.docChanged) {
			doc = editorView.state.doc;
			contentHeight = editorView.contentHeight;
		}
	});

	// Adding a few CSS properties to the codemirror base theme
	const myTheme = EditorView.baseTheme({
		"&.cm-editor": {
			height: "100%"
		},
		"&.cm-editor.cm-focused": {
			outline: "0px"
		}
	});

	// Codemirror editor is heavily using a extension structure to customize functionality of the editor 
	let stateExtensions = [basicSetup,keymap.of([indentWithTab]), markdown(), myTheme, EditorView.lineWrapping, updateHandler, darkThemeCompartment.of(darkMode ? oneDark : [])];
	
	onMount(() => {
		editorView = new EditorView({
			state: EditorState.create({
				extensions: stateExtensions
			}),
			parent: document.getElementById("editor")
		});
	});

</script>

<div id="editor">
</div>

<style>
	#editor {
		height: 100%;
		width: 100%;
	}
</style>