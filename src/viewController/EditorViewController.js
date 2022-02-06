const { BrowserWindow, ipcMain, globalShortcut } = require("electron");

const logger = require("../helper/appLogger");

/**
 * The EditorViewController handles the user interaction with the editor.
 * The editor will be created in a browser window that will exist the whole life time of the app.
 * The window will only be hidden, never closed, so that fresh started notes will still exist after hiding/showing a window.
 * 
 * Communication between editorViewController (main process) and editor html page (renderer process) is performed via ipc.
 * All advanced functionalities of the editor page are granted via editorAPI through extending the global window object.
 * 
 * To allow saving a note the appController provides a handler function. Maybe this should be done by pub/sub in the future.
 */
class EditorViewController {
	editorWindow;

	htmlPath; // path to html page loaded by the BrowserWindow
	apiPath; // path to pre-renderer script to expose advanced functionalities
	handler; // specific handlers provided by the appController to get and store data
	isDev;

	#appShouldBeClosed = false; // Reflects if it's safe to close the editor window, this should only happen if the app should be closed completely

	/**
	 * Register all ipc handlers to listen for user interactions to save a note.
	 * 
	 * @param {object} args Provided by the app controller
	 */
	constructor(args) {
		this.htmlPath = args.htmlPath;
		this.apiPath = args.apiPath;
		this.handler = args.handler;
		this.isDev = args.isDev;

		ipcMain.handle("storeNote", (event, noteData) => {
			return this.handler.storeNote(noteData);
		});
	}

	/**
	 * Public method to create the editor window. This should only happen once and is done by the app controller.
	 * 
	 * The browser window can't be closed by the user. It will only be hidden, if it's not needed.
	 */
	createEditorWindow() {
		this.editorWindow = new BrowserWindow({
			show: false,
			movable: false,
			fullscreenable: false,
			resizable: false,
			minimizable: false,
			maximizable: false,
			closable: true,
			width: 400,
			height: 400,
			webPreferences: {
				preload: this.apiPath,
				sandbox: true,
				contextIsolation: true,
				nodeIntegration: false
			}
		});
		this.editorWindow.setWindowButtonVisibility(false); // This way we have a header bar but no buttons to close the window.
		this.editorWindow.setVisibleOnAllWorkspaces(true); // User can switch between workspaces/desktops and editor will show up if toggled
		this.editorWindow.loadFile(this.htmlPath);

		this.editorWindow.on("focus", this.#addGlobalShortcuts);
		this.editorWindow.on("blur", () => {
			// Only hide window, if it's not already hidden by toggling the editor and keep it visible in dev mode for using the dev tools
			if (this.editorWindow.isVisible() && !this.isDev) {
				this.#hideEditorWindow();
			}
			// But always remove the global shortcuts, if the window is not focused
			this.#removeGlobalShortcuts();
		});

		if (this.isDev) {
			this.editorWindow.webContents.openDevTools({
				mode: "undocked"
			});
		}

		this.editorWindow.on("close", (event) => {
			// We only will close the window if the whole app should be closed.
			if (!this.#appShouldBeClosed) {
				event.preventDefault();
			}
		});
	}

	/**
	 * Public method to toggle the editor window.
	 * 
	 * @param {object} trayBounds Position of the tray icon so we can set the right position of the editor nearby.
	 */
	toggleEditorWindowVisibility = (trayBounds) => {
		if (this.editorWindow.isVisible()) {
			this.#hideEditorWindow();
		}
		else {
			this.#showEditorWindow(trayBounds);
		}
	};

	/**
	 * Public method to force closing the window. A normal close on the browser window will not work since we prevent the default behavior.
	 */
	closeEditorWindow = () => {
		logger.debug("Closing the editor window will be forced.");

		this.#appShouldBeClosed = true;
		this.editorWindow.close();
	};

	/**
	 * Brings the editor to the front. Therefor we have to calculate the position every time to support multiple screens.
	 * 
	 * @param {object} trayBounds 
	 */
	#showEditorWindow = (trayBounds) => {
		const appWindowPosition = this.#getCalculatedEditorWindowPosition(trayBounds);
		this.editorWindow.setPosition(appWindowPosition.x, appWindowPosition.y, false);
		logger.debug(`Position of the editor window was set to x:${appWindowPosition.x}, y: ${appWindowPosition.y}.`);

		this.editorWindow.show();
	};

	/**
	 * Will hide the browser window.
	 */
	#hideEditorWindow = () => {
		this.editorWindow.hide();
		logger.debug("Editor window was closed.");
	};

	/**
	 * Add a variety of global shortcuts to provide a custom experience for the user.
	 */
	#addGlobalShortcuts = () => {
		// User can save a note via short cut.
		if (!globalShortcut.isRegistered("Cmd+S")) {
			let globalSaveShortcut = globalShortcut.register("Cmd+S", () => {
				// Since there is already a way to store a note implemented in the editor we will trigger this way, so the editor is in sync
				logger.debug("Global shortcut to save a note was pressed! Info will be send via postMessage.");
				this.editorWindow.webContents.send("saveShortcutPressed");
			});
			if (!globalSaveShortcut) {
				logger.warn("Couldn't register global shortcut for saving.");
			}
		}

		// Prevents that the whole app will be closed
		if (!globalShortcut.isRegistered("Cmd+Q")) {
			let globalQuitShortcut = globalShortcut.register("Cmd+Q", () => {
				this.#hideEditorWindow();
			});
			if (!globalQuitShortcut) {
				logger.warn("Couldn't register global shortcut for quitting.");
			}
		}

		// Prevents that the whole app will be closed, since there would be no window left
		if (!globalShortcut.isRegistered("Cmd+W")) {
			let globalCloseShortcut = globalShortcut.register("Cmd+W", () => {
				this.#hideEditorWindow();
			});
			if (!globalCloseShortcut) {
				logger.warn("Couldn't register global shortcut for closing.");
			}
		}

		if (!this.isDev) {
			if (!globalShortcut.isRegistered("Cmd+R")) {
				let globalReloadShortcut = globalShortcut.register("Cmd+R", () => {
					// Empty function to prevent reloading the editor in production mode.
				});

				if (!globalReloadShortcut) {
					console.warn("Couldn't register global shortcut for reload.");
				}
			}
		}

		logger.debug("Global shortcuts for editor window were set.");
	};

	/**
	 * Removes global shortcuts so the user can use shortcuts like CMD-Q again.
	 */
	#removeGlobalShortcuts() {
		globalShortcut.unregister("Cmd+S");
		globalShortcut.unregister("Cmd+Q");
		globalShortcut.unregister("Cmd+W");
		globalShortcut.unregister("Cmd+R");

		logger.debug("Global shortcuts for editor window were removed.");
	}

	/**
	 * Calculates the position for the editor window.
	 * 
	 * @param {object} trayBounds 
	 * @returns {object} // Information where to set the editor window
	 */
	#getCalculatedEditorWindowPosition(trayBounds) {
		const windowBounds = this.editorWindow.getBounds();
		const x = Math.round(trayBounds.x + (trayBounds.width) - (windowBounds.width));
		const y = Math.round(trayBounds.y + trayBounds.height);

		logger.debug(`Window position is x:${windowBounds.x}, y:${windowBounds.y}. Current size of the window width:${windowBounds.width}, height:${windowBounds.height}.`);

		return {x, y};
	}
}

module.exports = EditorViewController;