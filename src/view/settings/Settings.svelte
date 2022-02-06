<script>
	import Toast from "../_components/Toast.svelte";
	import ShortcutDefiner from "../_components/ShortcutDefiner.svelte";
	import Switch from "../_components/Switch.svelte";
	
	const APP = window.APP;

	// This promise will be used to determine if settings can be shown
	let settingsDataPromise = APP.getSettingsData();
	let toastComponent;

	/**
	 * Handler for changing the launch on startup setting.
	 */
	function toggleLaunchOnStartup() {
		APP.logger.track("settings:toggleLaunchOnStartUp:start");
		APP.toggleLaunchOnStartup()
		.then(() => {
			APP.logger.track("settings:toggleLaunchOnStartUp:end");
			toastComponent.show("success", "Saved!", 1000);
		})
		.catch(() => {
			APP.logger.track("settings:toggleLaunchOnStartUp:error");
			toastComponent.show("error", "Couldn't save new option! Will reload ...", 2000, () => {location.reload()});
		});
	}

	/**
	 * Handler for changing the theme setting.
	 */
	function toggleTheme() {
		APP.logger.track("settings:toggleTheme:start");
		APP.toggleTheme()
		.then(() => {
			APP.logger.track("settings:toggleTheme:end");
			toastComponent.show("success", "Saved!", 1000);
		})
		.catch(() => {
			APP.logger.track("settings:toggleTheme:error");
			toastComponent.show("error", "Couldn't save new option! Will reload ...", 2000, () => {location.reload()})
		});
	}

	/**
	 * Handler for triggering the openFileDialog. Users selection of a new folder will be handled by the main process.
	 */
	function openFileDialog() {
		APP.logger.track("settings:openFileDialog:start");
		APP.openFileDialog()
		.then((result) => {
			APP.logger.track("settings:openFileDialog:end");
			if (result.newValue !== undefined) {
				window.document.getElementById("notePathInput").innerText = result.newValue;
				toastComponent.show("success", "Saved!", 1000);
			}
		})
		.catch(() => {
			APP.logger.track("settings:openFileDialog:error");
			toastComponent.show("error", "Couldn't save new option! Will reload ...", 2000, () => {location.reload()});
		});
	}

	/**
	 * Success handler for the ShortCutDefiner component. Tries to save a new global shortcut.
	 * 
	 * @param {string} accelerator // new global shortcut
	 */
	function setGlobalShortcut(accelerator) {
		APP.logger.track("settings:setGlobalShortcut:start");
		return new Promise((resolve, reject) => {
			APP.setGlobalShortcut(accelerator)
			.then(() => {
				APP.logger.track("settings:setGlobalShortcut:end");
				toastComponent.show("success", "Saved!", 1000);
				resolve();
			})
			.catch(() => {
				APP.logger.track("settings:setGlobalShortcut:error");
				toastComponent.show("error", "Couldn't save new option!", 2000);
				reject();
			});
		});
	}
</script>

<main>
	<Toast top="15px" bind:this={toastComponent} />

	<h1>Settings</h1>

	<hr class="divider" />

	{#await settingsDataPromise}
		<p>Loading Settings ...</p>
	{:then data}
		<div class="card">
			<div class="header">
				<h2>Auto start</h2>
			</div>	
			<div class="info">
				Should the app auto start on system start?
			</div>
			<div class="action">
				<span class="right"><Switch checked="{data.settings.launchOnStartup}" changeHandler="{toggleLaunchOnStartup}"/></span>
			</div>
		</div>

		<div class="card">
			<div class="header">
				<h2>Dark Theme</h2>
			</div>	
			<div class="info">
				The app is supporting a light and dark theme. As default we use always your global system preferences. But please feel free to switch this app.
			</div>
			<div class="action">
				<span class="right"><Switch checked="{data.settings.darkTheme}" changeHandler="{toggleTheme}"/></span>
			</div>
		</div>
			
		<div class="card">
			<div class="header">
				<h2>Note folder</h2>
			</div>
			<div class="info">
				Your notes will be saved locally. As default we're using your documents folder. But you can change this here.
			</div>	
			<div class="action">
				<span class="filePath left" id="notePathInput"> {data.settings.notePath} </span>
				<button class="right" on:click="{openFileDialog}">Change</button>
			</div>
		</div>

		<div class="card">
			<div class="header">
				<h2>Global Shortcut</h2>
			</div>
			<div class="info">
				To open the editor you can setup a global shortcut. Everytime you are then using this shorcut the editor window will open or close.
			</div>
			<div class="action">
				<ShortcutDefiner successHandler="{setGlobalShortcut}" shortcutAccelerator="{data.settings.globalShortcutAccelerator}" defaultShortcutRepresentation="{data.settings.globalShortcutRepresentation}"/>
			</div>
		</div>

		<hr class="divider" />

	{:catch error}
		<p>Something went wrong: {error.message}</p>
	{/await}
</main>

<style>
	:global(html, body) {
		position: relative;
		width: 100%;
		height: 100%;
	}

	:global(body) {
		margin: 0;
		padding: 2px 15px 2px 15px;
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
		font-size: smaller;
	}

	:global(h1, h2) {
		font-weight: normal;
	}

	:global(button) {
		background-color:#3d95e1;
		color: white;
		height: 30px;
		border: none;
		border-radius: 1px;
	}

	:global(button:active) {
		background-color:#2275be;
	}

	@media (prefers-color-scheme: dark) {
		:global(body) { background: #282c34; color: #abb2bf; }
	}
	
	@media (prefers-color-scheme: light) {
		:global(body) { background: #f8f9fa; color: #343a40; }
	}

	/* Support light and dark theme */
	.card {
		margin-bottom: 20px;
		padding: 10px 5px 10px 5px;
		border-radius: 2px;
	}

	.header {
		margin-bottom: 10px;
	}

	.info {
		margin-bottom: 10px;
	}

	.action {
		text-align: left;
		overflow: auto;
	}
	
	.filePath {
		font-style: italic;
		width: 70%;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.right {
		float: right;
		margin-right: 5px;
	}

	.left {
		float: left;
	}

	h1 {
		margin: 10px 0 0 0;
	}

	h2 {
		margin: 0;

	}

	@media (prefers-color-scheme: dark) {
		.card {
			background-color: #2c313a;
		}
		
		.divider {
			margin: 5px 0 20px 0;
			border: 1px solid #2c313a;
		}
  }
  
	@media (prefers-color-scheme: light) {
		.card {
			background-color: #ffffff;
		}
		
		.divider {
			margin: 5px 0 20px 0;
			border: 1px solid #dee2e6;
		}
	}
</style>