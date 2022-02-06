<script>
import { onMount } from "svelte";

	export let shortcutAccelerator;
	export let defaultShortcutRepresentation;
	export let successHandler;
	
	// HTML input element that is used to register the input
	let shortcutInputElement;

	// Holds the state of the current pressed keys or the last complete (supported or unsupported) shortcut combination.
	let stateShortcutKeys = {
			metaKey: false,
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			shortcutKeySupported: undefined,
			shortcutKey: false
		};
	// Used to temporally save the last complete shortcut, in case the user don't enter a new shortcut, we can reset the state with this information
	let oldStateShortcutKeys;
	let oldShortcutAccelerator;

	// Set the state of a already saved shortcut
	if (shortcutAccelerator !== null) {
		stateShortcutKeys.metaKey = shortcutAccelerator.includes("Cmd") ? true : false;
		stateShortcutKeys.ctrlKey = shortcutAccelerator.includes("Control") ? true : false;
		stateShortcutKeys.shiftKey = shortcutAccelerator.includes("Shift") ? true : false;
		stateShortcutKeys.altKey = shortcutAccelerator.includes("Alt") ? true : false;
		stateShortcutKeys.shortcutKeySupported = defaultShortcutRepresentation ? true : undefined;
		stateShortcutKeys.shortcutKey = defaultShortcutRepresentation ? defaultShortcutRepresentation : false;
	}

	/**
	 * Helper to identifier if a key is a modifier key.
	 * 
	 * @param {string} key keyCode
	 * @returns {boolean} whether the provided keyCode is a modifier key or not.
	 */
	function isModifierKey(key) {
		if (["Meta", "Alt", "Shift", "Control"].includes(key))
			return true;

		return false;
	}
	
	/**
	 * Checks the shortcut state object if a modifier key is used. Because only then it can be a valid shortcut.
	 * 
	 * @returns {boolean} whether a modifier key is used or not.
	 */
	function isModifierKeyUsed() {
		if (stateShortcutKeys.metaKey || stateShortcutKeys.ctrlKey || stateShortcutKeys.shiftKey || stateShortcutKeys.altKey)
			return true

		return false;
	}

	/**
	 * Helper to get a valid modifier string of the current shortcut for the accelerator string.
	 * 
	 * @returns {string} Valid expression for accelerator string.
	 */
	function getModifierString() {
		let string = "";

		if (stateShortcutKeys.metaKey)
			string += "Cmd+";
		if (stateShortcutKeys.ctrlKey)
			string += "Control+";
		if (stateShortcutKeys.shiftKey)
			string += "Shift+";
		if (stateShortcutKeys.altKey)
			string += "Alt+";

		return string;
	}

	/**
	 * Provides a valid expression for a given key code. 
	 * This method supports all the documented keys from the electron documentation.
	 * 
	 * @param {string} keycode
	 * @returns {string|undefined} Valid expression for accelerator string.
	 */
	function getAcceleratorStringFromKeycode(keycode) {
		if (typeof(keycode) !== "string")
			return undefined

		// 0 to 9 and A to Z
		if (keycode.includes("Digit") || keycode.includes("Key"))
			return keycode.slice(-1);

		// F1 to F24
		if (["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F21", "F22", "F23", "F24"].includes(keycode))
			return keycode;
		
		// Numpad
		if (["Numpad0", "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9"].includes(keycode))
			return "num" + keycode.slice(-1);
		else if (keycode === "NumpadDecimal")
			return "numadd";
		else if (keycode === "NumpadAdd")
			return "numdec";
		else if (keycode === "NumpadSubtract")
			return "numsub";
		else if (keycode === "NumpadMultiply")
			return "nummult";
		else if (keycode === "NumpadDivide")
			return "numdiv";
		else if (keycode === "Numlock")
			return "Numlock";

		// Punctuation
		if (keycode === "Minus")
			return "-";
		else if (keycode === "Equal")
			return "=";
		else if (keycode === "Equal")
			return "=";
		else if (keycode === "BracketLeft")
			return "[";
		else if (keycode === "BracketRight")
			return "]";
		else if (keycode === "Semicolon")
			return ";";
		else if (keycode === "Quote")
			return "'";
		else if (keycode === "Comma")
			return ",";
		else if (keycode === "Period")
			return ".";
		else if (keycode === "Slash")
			return "/";
		
		// various keys
		if (keycode === "Space")
			return "Space";
		else if (keycode === "Tab")
			return "Tab";
		else if (keycode === "CapsLock")
			return "Capslock";
		else if (keycode === "Backspace")
			return "Backspace";
		else if (keycode === "Delete")
			return "Delete";
		else if (keycode === "ScrollLock")
			return "Scrolllock";
		else if (keycode === "PrintScreen")
			return "PrintScreen";
		else if (keycode === "Insert")
			return "Insert";
		else if (keycode === "Enter")
			return "Enter";
		else if (keycode === "ArrowDown")
			return "Down";
		else if (keycode === "ArrowUp")
			return "Up";
		else if (keycode === "ArrowLeft")
			return "Left";
		else if (keycode === "ArrowRight")
			return "Right";
		else if (keycode === "Home")
			return "Home";
		else if (keycode === "End")
			return "End";
		else if (keycode === "PageDown")
			return "PageDown";
		else if (keycode === "PageUp")
			return "PageUp";

		return undefined;
	}

	/**
	 * Handels the keyDown event and updates the current shortcut state.
	 * 
	 * @param {object} event keyboard event
	 */
	function keydownHandler(event) {
		event.preventDefault();

		// user can cancel entering a new shortcut anytime
		if (event.key === "Escape") {
			shortcutInputElement.blur();
			return;
		}

		stateShortcutKeys.metaKey = event.metaKey;
		stateShortcutKeys.ctrlKey = event.ctrlKey;
		stateShortcutKeys.altKey = event.altKey;
		stateShortcutKeys.shiftKey = event.shiftKey;

		// Only go here, if current pressed key is not a modifier key AND at least one modifier key is already pressed
		if (!isModifierKey(event.key) && isModifierKeyUsed()) {
			// we only get a shortcut key, if the current pressed key can be used for shortcuts according to the electron documentation
			let shortcutKey = getAcceleratorStringFromKeycode(event.code);

			if (shortcutKey) { // we have a valid shortcut
				stateShortcutKeys.shortcutKey = event.key;
				stateShortcutKeys.shortcutKeySupported = true;

				shortcutAccelerator = getModifierString() + shortcutKey;
				successHandler({
					accelerator: shortcutAccelerator, 
					representation: event.key
				})
				.catch(() => {
					shortcutAccelerator = oldShortcutAccelerator;
					stateShortcutKeys = oldStateShortcutKeys;
				});
			}
			else { // we have a shortcut, but it's not valid for electron global shortcuts
				shortcutAccelerator = getModifierString() + event.key;
				stateShortcutKeys.shortcutKey = event.key;
				stateShortcutKeys.shortcutKeySupported = false;

				APP.logger.debug("User has entered a not supported keyboard shortcut: " + shortcutAccelerator);
			}

			shortcutInputElement.blur();
		}
	}
	
	/**
	 * Handels the keyUp event and updates the state of the modifier keys.
	 * Other keys we don't have to keep track of, because a shortcut always needs modifier keys.
	 * And if an other key is pressed, this is already be handled by the keyDown handler.
	 * 
	 * @param {object} event keyboard event
	 */
	function keyupHandler(event) {
		event.preventDefault();

		stateShortcutKeys.metaKey = event.metaKey;
		stateShortcutKeys.ctrlKey = event.ctrlKey;
		stateShortcutKeys.altKey = event.altKey;
		stateShortcutKeys.shiftKey = event.shiftKey;
	}
	
	/**
	 * Used if the user wants to add/edit a shortcut. Needs to save the old state in case a user cancels the input.
	 */
	function focusHandler() {
		// If we already have a valid shortcut, we save it so we can reset to it if needed
		if (stateShortcutKeys.shortcutKeySupported !== false) {
			oldStateShortcutKeys = stateShortcutKeys;
			oldShortcutAccelerator = shortcutAccelerator;
		}

		// start with a fresh state
		stateShortcutKeys = {
			metaKey: false,
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			shortcutKeySupported: undefined,
			shortcutKey: false
		};
		shortcutAccelerator = "";

		document.addEventListener("keydown", keydownHandler, true);
		document.addEventListener("keyup", keyupHandler, true);
	}

	/**
	 * Used if the shortcut input was canceld.
	 */
	function blurHandler() {
		if (shortcutAccelerator === "") {
			stateShortcutKeys = oldStateShortcutKeys;
			shortcutAccelerator = oldShortcutAccelerator;
		}

		document.removeEventListener("keydown", keydownHandler, true);
		document.removeEventListener("keyup", keyupHandler, true);
	}

	/**
	 * Used by the 'New shortcut' button to start shortcut input.
	 */
	function activateShortcutInput() {
		shortcutInputElement.focus();
	}

	/**
	 * Used by the 'Delete' button, if the user wants to delete the current saved shortcut.
	 */
	function deleteShortcut() {
		successHandler({
			accelerator: null, 
			representation: null
		})
		.then(() => {
			shortcutAccelerator = null;
			stateShortcutKeys = {
				metaKey: false,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				shortcutKeySupported: undefined,
				shortcutKey: false
			};

			oldStateShortcutKeys = stateShortcutKeys;
			oldShortcutAccelerator = shortcutAccelerator;
		})
		.catch(() => {
			APP.logger.error("Couldn't delelte current saved shortcut.");
		});
	}

	/**
	 * Used if the user has enterd a invalid shortcut and wants to display the previous state.
	 */
	function resetShortcut() {
		stateShortcutKeys = oldStateShortcutKeys;
		shortcutAccelerator = oldShortcutAccelerator;
	}

	onMount(() => {
		// Usind a hidden input to handle the keyboard events
		shortcutInputElement = window.document.getElementById("shortcutInput");   
	});

</script>


<div class="container">
	<input id="shortcutInput" class="left" type="text" bind:value="{shortcutAccelerator}" autocomplete="off" on:focus="{focusHandler}" on:blur="{blurHandler}"/>

	<div class="shortcut left {stateShortcutKeys.shortcutKeySupported === false ? "unsupported" : ""}">
		{#if shortcutAccelerator === null}
			<div class="key left">
				No shortcut set
			</div>
		{:else if !(stateShortcutKeys.metaKey || stateShortcutKeys.altKey || stateShortcutKeys.ctrl || stateShortcutKeys.shiftKey)}
			<div class="key key-press-notification left">
				Please press keys ...
			</div>
		{/if}

		{#if stateShortcutKeys.metaKey}
		<div class="key left">Cmd</div> <div class="plus left">+</div>
		{/if}

		{#if stateShortcutKeys.altKey}
			<div class="key left">Alt</div> <div class="plus left">+</div>
		{/if}

		{#if stateShortcutKeys.ctrlKey}
			<div class="key left">Ctrl</div> <div class="plus left">+</div>
		{/if}

		{#if stateShortcutKeys.shiftKey}
			<div class="key left">Shift</div> <div class="plus left">+</div>
		{/if}

		{#if stateShortcutKeys.shortcutKey}
			<div class="key left">{stateShortcutKeys.shortcutKey}</div>
		{/if}
	</div>


	<div class="right">
		<button on:click="{activateShortcutInput}">New shortcut</button>
		
		{#if shortcutAccelerator !== null && shortcutAccelerator !== ""}
			<button on:click="{deleteShortcut}">Delete</button>
		{/if}
	</div>
</div>

{#if stateShortcutKeys.shortcutKeySupported === false}
	<div class="unsupported error-notification">
		Not saved. Shortcut is not supported. <span class="text-button unsupported" on:click="{resetShortcut}">Undo</span>
	</div>
{/if}

<style>
	.container {
		overflow: auto;
	}

	.shortcut {
		height: 30px;
	}

	.right {
		float: right;
		margin-right: 5px;
	}

	.left {
		float: left;
	}

	input {
		opacity: 0;
		width: 0;
		height: 0;
		margin: 0;
		padding: 0;
		border: 0;
		overflow: hidden;
	}

	.unsupported {
		color: red;
		font-style: italic;
	}

	.plus {
		height: 28px;
		line-height: 28px;
		margin-right: 5px;
		margin-left: 5px;
	}

	.error-notification {
		font-size: smaller;
		margin-top: 5px;
	}

	.text-button {
		text-decoration: underline;
	}

	.key-press-notification {
		border: 0;
		font-style: italic;
	}

	@media (prefers-color-scheme: dark) {
		.key {
			border: 1px solid white;
			border-radius: 5px;
			margin-right: 5px;
			margin-left: 5px;
			padding-left: 5px;
			padding-right: 5px;
			height: 28px;
			line-height: 28px;
		}
  }
  
	@media (prefers-color-scheme: light) {

		.key {
			border: 1px solid #343a40;
			border-radius: 5px;
			margin-right: 5px;
			margin-left: 5px;
			padding-left: 5px;
			padding-right: 5px;
			height: 28px;
			line-height: 28px;
		}
	}
</style>