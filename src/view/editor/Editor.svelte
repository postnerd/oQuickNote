<script>
	import Editor from "../_components/TextEditor.svelte";
	import FloatingButton from "../_components/FloatingButton.svelte";
	import Toast from "../_components/Toast.svelte";

	// Advanced functionallity exposed via preload script
	const APP = window.APP;
	
	let editorComponent;
	let toastComponent;

	// Holds the content and document information of the current note
	let docObject = "";
	// Height of the text editor for the current note
	let contentHeight = 0;

	// Store a note, if the user used the global shortcut for storing a note. Message was send by editorAPI and invoked by editorViewController
	window.onmessage = (event) => {
		if (event.source === window) {
			if (event.data === "saveNote" && docObject.length) {
				APP.logger.debug("Received message to store a note.");
				saveNote();
			}
			else {
				APP.logger.warn(`Received unidentified post from ${event.source} with following data ${event.data}.`);
			}
		}
	};

	// Handler for user action to store the current note
	const saveNote = () => {
		APP.logger.track("editor:save:start");
		let noteContent = docObject.toString();

		APP.storeNote(noteContent)
		.then((result) => {
			APP.logger.track("editor:save:end");
			editorComponent.resetEditor();
			toastComponent.show("success", `Saved`, 1000);
		})
		.catch((result) => {
			APP.logger.track("editor:save:error");
			toastComponent.show("error", `Couldn't save!`, 1000);
		});
	}
</script>

<main>
	<Toast top="15px" bind:this={toastComponent}/>

	<div class="editorWrapper">
		<Editor bind:this={editorComponent} bind:doc={docObject} bind:contentHeight="{contentHeight}"/>
	</div>
	<div class="footerWrapper">
		{docObject.length} chars
	</div>

	<FloatingButton clickHandler={saveNote} bottom="40px" disabled={docObject.length ? false:true} isTransparent="{contentHeight > 300 ? true : false}"/>	
</main>

<style>
	:global(html, body) {
		position: relative;
		width: 100%;
		height: 100%;
		margin: 0;
	}	

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
	}

	@media (prefers-color-scheme: dark) {
		:global(body) { background: #282c34; color: #abb2bf; }
	}
	
	@media (prefers-color-scheme: light) {
		:global(body) { background: #f8f9fa; color: #343a40; }
	}
	
	main {
		height: 100%;
		width: 100%;
	}

	.footerWrapper {
		height: 20px;
		line-height: 20px;
		background-color: #3d95e1;
		padding-right: 10px;
		text-align: right;
		color: white;
		font-size: smaller;
	}

	.editorWrapper {
		height: calc(100% - 20px)
	}
</style>