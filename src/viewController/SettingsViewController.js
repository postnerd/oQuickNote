const {BrowserWindow, ipcMain, dialog, globalShortcut} = require("electron");

const logger = require("../helper/appLogger");

/**
 * The SettingsViewController handles the user interaction with the settings page. 
 * Settings page is rendered via an independent BrowserWindow and html page.
 * 
 * Communication between settingsViewController (main process) and settings html page (renderer process) is performed via ipc.
 * All advanced functionalities of the settings page are granted via settingsAPI through extending the global window object.
 * 
 * To allow changing the settings the appController provides multiple handler functions. Maybe this should be done by pub/sub in the future.
 */
class SettingsViewController {
	settingsWindow;

	htmlPath; // path to html page loaded by the BrowserWindow
	apiPath; // path to pre-renderer script to expose advanced functionalities
	handler; // specific handlers provided by the appController to get and store data
	isDev;

	/**
	 * Register all ipc handlers to listen for user interactions to change settings.
	 * 
	 * @param {object} args Provided by the app controller
	 */
	constructor(args) {
		logger.track("settingsViewController:constructor:start");

		this.htmlPath = args.htmlPath;
		this.apiPath = args.apiPath;
		this.handler = args.handler;
		this.isDev = args.isDev;

		ipcMain.handle("getSettingsData", () => {
			return {
				settings: this.handler.getSettingsData()
			};
		});

		ipcMain.handle("toggleLaunchOnStartup", () => {
			let newValue = !this.handler.getSettingsData().launchOnStartup;

			this.handler.changeSettingsData("launchOnStartup", newValue);

			return {
				newValue: newValue
			};
		});

		ipcMain.handle("toggleTheme", () => {
			let newValue = !this.handler.getSettingsData().darkTheme;

			this.handler.changeSettingsData("darkTheme", newValue);

			return {
				newValue: newValue
			};
		});

		ipcMain.handle("openFileDialog", () => {
			let newValue = dialog.showOpenDialogSync(this.settingsWindow, {
				properties: ["openDirectory", "createDirectory"],
				buttonLabel: "Select"
			});

			if (newValue) {
				this.handler.changeSettingsData("notePath", newValue[0]);
			}

			return {
				newValue: newValue
			};
		});

		ipcMain.handle("setGlobalShortcut", (event, shortcutData) => {
			if (shortcutData.accelerator) {
				// Just register the shortcut to check, if it's possible
				// In the future, when there are more global shortcuts, we surely have to manage this in a more complex way
				let isGlobalAppShortcutRegistered = globalShortcut.register(shortcutData.accelerator, () => {
					// Empty function because actual registration will be handled by appController
				});

				if (isGlobalAppShortcutRegistered) {
					// Unregister shortcut because the real registration will be handled by the appController as an onChange event when the settings will change 
					globalShortcut.unregister(shortcutData.accelerator);

					this.handler.changeSettingsData("globalShortcutAccelerator", shortcutData.accelerator);
					this.handler.changeSettingsData("globalShortcutRepresentation", shortcutData.representation);

					return {
						newValue: {
							accelerator: shortcutData.accelerator,
							representation: shortcutData.representation
						}
					};
				}
				else {
					logger.error(`Check for new global shortcut faild for '${shortcutData.accelerator}'!`);
					throw new Error(`Check for new global shortcut faild for '${shortcutData.accelerator}'!`);
				}

			}
			else if (shortcutData.accelerator === null && shortcutData.representation === null) {
				this.handler.changeSettingsData("globalShortcutAccelerator", null);
				this.handler.changeSettingsData("globalShortcutRepresentation", null);

				return {
					newValue: {
						accelerator: shortcutData.accelerator,
						representation: shortcutData.representation
					}
				};
			}
			else {
				logger.error("No valid short cut accelerator was provided!");
				throw new Error("No valid short cut accelerator was provided!");
			}
		});

		logger.track("settingsViewController:constructor:end");
	}

	/**
	 * Creates the settings window. This window can be closed by the user and has to be re-created.
	 */
	#createSettingsWindow() {
		this.settingsWindow = new BrowserWindow({
			show: true,
			height: 700,
			width: 600,
			webPreferences: {
				preload: this.apiPath,
				sandbox: true,
				contextIsolation: true,
				nodeIntegration: false
			}
		});
		this.settingsWindow.loadFile(this.htmlPath);

		if (this.isDev) {
			this.settingsWindow.webContents.openDevTools({
				mode: "undocked"
			});
		}

		// We have to take care of the CMD-Q shortcut since it would close the whole app, but we just want to close the window
		this.settingsWindow.on("focus", this.#addGlobalShortcuts);
		this.settingsWindow.on("blur", this.#removeGlobalShortcuts);

		// Since the user can close the window, we have to delete the reference and unregister the global shortcuts
		this.settingsWindow.on("closed", () => {
			logger.debug("Settings window was closed.");
			this.#removeGlobalShortcuts();
			this.settingsWindow = null;
		});
	}

	/**
	 * Public method to show the settings window.
	 * 
	 * We have to handle different situations, since not always we need to re-create the window.
	 */
	showSettingsWindow = () => {
		if (this.settingsWindow) {
			// If the window is visible but maybe hidden behind other windows just show it.
			if (this.settingsWindow.isVisible()) {
				this.settingsWindow.show();
			}
			// If the user has minimized the window before, we have to restore it
			else if (this.settingsWindow.isMinimized()) {
				this.settingsWindow.restore();
			}
		}
		else {
			this.#createSettingsWindow();
		}
	};

	/**
	 * Handles custom behavior of global shortcuts to support a unique behavior of the settings window.
	 */
	#addGlobalShortcuts = () => {
		if (!globalShortcut.isRegistered("Cmd+Q")) {
			let globalQuitShortcut = globalShortcut.register("Cmd+Q", () => {
				this.settingsWindow.close();
			});
			if (!globalQuitShortcut) {
				console.log("Couldn't register global shortcut for quitting.");
			}
		}
	};

	/**
	 * Removes the registered global shortcuts that were only needed for the settings window.
	 */
	#removeGlobalShortcuts = () => {
		globalShortcut.unregister("Cmd+Q");
	};
}

module.exports = SettingsViewController;