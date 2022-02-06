const { globalShortcut, nativeTheme, session } = require("electron");
const path = require("path");

const SettingsController = require("./SettingsController");
const StoreController = require("./StoreController.js");

const TrayViewController = require("../viewController/TrayViewController");
const SettingsViewController = require("../viewController/SettingsViewController");
const EditorViewController = require("../viewController/EditorViewController");

const logger = require("../helper/appLogger");

/**
 * This will be used for the settings controller to ensure proper settings changes and can be used by the frontend to show valid setting options.
 * @todo Could be outsourced to a separate file.
 */
const settingOptions = {
	"launchOnStartup": [
		{
			"value": true,
			"label": "Yes"
		},
		{
			"value": false,
			"label": "No"
		}

	],
	"notePath": [
		{
			"value": "",
			"label": "Folder path for notes"
		}
	],
	"darkTheme": [
		{
			"value": false,
			"label": "light"
		},
		{
			"value": true,
			"label": "dark"
		}
	],
	"globalShortcutAccelerator": [
		{
			"value": "",
			"label": "Shortcut to open note window"
		}
	],
	"globalShortcutRepresentation": [
		{
			"value": "",
			"label": "Representation of shortcut key"
		}
	]
};

/**
 * Used as default settings if app runs for the first time or the settings file was deleted.
 * 
 * Don't use a nested structure to ensure proper migration handling by the settings controller if new settings are added or old ones are removed.
 * Don't use 'undefined' as a default value to ensure proper migration handling by the settings controller. Because undefined will be interpreted as a none existing setting option.
 * 
 * @todo Could be outsourced to a separate file.
 */
const defaultSettings = {
	"launchOnStartup": settingOptions.launchOnStartup[0].value,
	"notePath": null,
	"darkTheme": nativeTheme.shouldUseDarkColors ? settingOptions.darkTheme[1].value : settingOptions.darkTheme[0].value,
	"globalShortcutAccelerator": null,
	"globalShortcutRepresentation": null
} 

/**
 * This controller handles the main app logic.
 * 
 * It holds all the main controller and view controller and takes care of handling global app communication. 
 * Communication between different view controllers is handled via passing methods as advanced view functions to each view controller. (In the future this should maybe be done by a pub/sub instance.)
 */
class AppController {
    // Holds the electron app object. Is passed by main.js.
	electronApp;

	// The appController holds instances of all controllers to handle global communication between different controllers
	settingsController;
	storeController;

	trayViewController;
    editorViewController;
	settingsViewController;

	isDev;
	appPath;
	settingOptions;
	defaultSettings;

    /**
	 * Setting up the app and initialize all needed controllers. 
	 * 
	 * @param {object} electronApp It's the electron app object. It also could be get by 'require("electron")', but this way it's clear, only the app controller should interact with it. 
	 * @param {boolean} isDev Information is passed from main.js via argv.
	 */
	constructor(electronApp, isDev) {
		logger.track("appController:constructor:start");

        this.electronApp = electronApp;
		this.isDev = isDev;

		this.settingOptions = settingOptions;
		this.defaultSettings = defaultSettings;
		
		// All app files will be in the "app" folder. In an production environment this will be the only folder included, but in development environment we are starting the app from the root folder so we have to extend the appPath 
		this.appPath = this.electronApp.isPackaged ? this.electronApp.getAppPath() : path.join(this.electronApp.getAppPath(), "app");
		logger.info(`App path was set to: ${this.appPath}`);
		
		this.setupSettingsController();
		this.setupStoreController();
		this.setupSettingsViewController();
		this.setupEditorViewController();

		this.setupThemeSupport();
		this.setupStartupSupport();

        this.electronApp.on("ready", () => {
			logger.track("appController:electron:ready:start");
			// This is only done for security reasons
			this.setupSessionHandling();
			
			this.setupGlobalShortcutSupport();

			// The editor view will be created as a hidden BrowserWindow, so the user can toggle the visibility in the future
			this.editorViewController.createEditorWindow();

			// We finally create the tray, so the user know, he can start interacting with the app
			this.setupTrayViewController();

			// Because the app should feel as light as possible we hide the dock icon, besides the user will have no real benefit with showing it anyway
			this.electronApp.dock.hide();

			logger.track("appController:electron:ready:end");
		});

		// For security reasons we try to have restrict rules for the browser views, so no other browser windows or webpages could be opened or loaded (shouldn't be that important for local files, but who knows)
		this.electronApp.on('web-contents-created', (event, contents) => {
			contents.setWindowOpenHandler(({ url }) => {
				logger.warn(`'setWindowOpenHandler' was called to open ${url}. Request will be denied!`)
				return { action: 'deny' }
			  })
			
			contents.on('will-navigate', (event, navigationUrl) => {
				// We are only allowing the renderer to go to the same URL so the renderer could force a reload of the page
				if (event.sender.getURL() !== navigationUrl) {
					logger.warn(`'will-navigate' was called to open ${navigationUrl}. Request will be denied!`)
					event.preventDefault();
				}
			});

			contents.on('will-attach-webview', (event, webPreferences, params) => {
				logger.warn(`'will-attach-webview' was called. Request will be denied!`)
				event.preventDefault();
			});
		});
		
		// App will quit automatically if all browser windows are closed
		this.electronApp.on("will-quit", () => {
			logger.info("App will quit.")

			globalShortcut.unregisterAll();
			
			logger.debug("Unregistered all global shortcuts.")
		});

		logger.track("appController:constructor:end");
    }

	/**
	 * The SettingsController manages storing the application settings.
	 * 
	 * SettingsController will be initialized with default settings, if there isn't already a settings file.
	 * settingOptions will be passed to help migrating and validating setting changes.
	 */
	setupSettingsController() {
		const settingsPath = path.join(this.electronApp.getPath("userData"), "appSettings.json");
		logger.info(`Settings path is ${settingsPath}`);

		this.settingsController = new SettingsController(settingsPath, this.defaultSettings, this.settingOptions);
	}

	/**
	 * The StoreController handles storing the user notes. A user can change the folder destination in the app settings.
	 */
	setupStoreController() {
		if (this.settingsController.getSettingsData().notePath === null) {
			this.settingsController.changeSetting("notePath", path.join(this.electronApp.getPath("documents"), this.electronApp.getName()));
		}

		const notePath = this.settingsController.getSettingsData().notePath;
		
		this.storeController = new StoreController(notePath);
		
		// We have to keep track of the note path, so if the user changes this in settings, we update the storeController.
		this.settingsController.on("change:notePath", () => {
			this.storeController.setStorePath(this.settingsController.getSettingsData().notePath);
		});
	}

	/**
	 * The SettingsViewController handles the creation and user interaction with the settings page. 
	 */
	setupSettingsViewController() {
		this.settingsViewController = new SettingsViewController({
			htmlPath: path.join(this.appPath, "renderer", "settings", "settings.html"),
			apiPath: path.join(this.appPath, "renderer", "settings", "settingsAPI.js"),
			handler: {
				getSettingsData: this.settingsController.getSettingsData,
				changeSettingsData: this.settingsController.changeSetting
			},		
			isDev: this.isDev
		});
	}

	/**
	 * THe EditorViewController handles the creation and user interaction with the editor.
	 */
	setupEditorViewController() {
		this.editorViewController = new EditorViewController({
			htmlPath: path.join(this.appPath, "renderer", "editor", "editor.html"),
			apiPath: path.join(this.appPath, "renderer", "editor", "editorAPI.js"),
			handler: {
				storeNote: this.storeController.storeNote
			},
			isDev: this.isDev
		});
	}

	/**
	 * The TrayViewController handles creation and user interaction with the tray icon. On user interaction it will emit several events. 
	 */
	setupTrayViewController() {
		// We use different icon paths so it's easier in development to distinguish between prod and dev app
		let iconPath = path.join(this.appPath, "icons", this.isDev ? "trayIconDev.png" : "trayIcon.png");
		logger.debug(`Tray icon should be located at '${iconPath}'`);
		
		this.trayViewController = new TrayViewController(iconPath); 
		
		this.trayViewController.on("tray:showSettingsWindow", this.settingsViewController.showSettingsWindow);

		this.trayViewController.on("tray:toggleEditorWindowVisibility", () => {
			this.editorViewController.toggleEditorWindowVisibility(this.trayViewController.tray.getBounds());
		});

		this.trayViewController.on("tray:quitApp", () => {
			// We have to make sure, every browser window is closed
			if (this.settingsViewController.settingsWindow) {
				this.settingsViewController.settingsWindow.close();
			}
			// So with closing the editor window the app will close automatically, we have to use a custom close method because editorViewController would prevent closing the editor window otherwise
			this.editorViewController.closeEditorWindow();
		});
	}
	
	/**
	 * As default we support the system theme option. But user can always change this at the settings page.
	 */
	setupThemeSupport() {
		// Set theme to currently saved setting option
		nativeTheme.themeSource = this.settingsController.getSettingsData().darkTheme ? "dark" : "light";

		// Keep track if user changes the theme at the settings page and change the theme
		this.settingsController.on("change:darkTheme", () => {
			nativeTheme.themeSource = this.settingsController.getSettingsData().darkTheme ? "dark" : "light";
		});
	}

	/**
	 * Handling support to launch this app on system startup automatically.
	 */
	setupStartupSupport() {
		// Per default we launch the app on system startup automatically. So we have to set this on first app start
		this.electronApp.setLoginItemSettings({
			openAtLogin: this.settingsController.getSettingsData().launchOnStartup
		});

		// Keep track id user changes this on the settings page
		this.settingsController.on("change:launchOnStartup", () => {
			this.electronApp.setLoginItemSettings({
				openAtLogin: this.settingsController.getSettingsData().launchOnStartup
			});
		});		
	}

	/**
	 * Handling global shortcut support to toggling the editor. User can delete or change this shortcut on settings page.
	 */
	setupGlobalShortcutSupport() {
		let globalShortcutAccelerator = this.settingsController.getSettingsData().globalShortcutAccelerator;
		if (globalShortcutAccelerator !== null) {
			// If a global shortcut for toggling the editor window is set, we try to register it
			let isGlobalShortcutRegistered = globalShortcut.register(globalShortcutAccelerator, () => {
				// If the shortcut is used, we will toggling the editor window
				this.editorViewController.toggleEditorWindowVisibility(this.trayViewController.tray.getBounds());
			});

			// Normally it shouldn't be a problem to register the shortcut because it was tested by the settingsViewController before saving
			if (!isGlobalShortcutRegistered) {
				logger.error("Couldn't register global shortcut for toggling app window!");
			} 
			else {
				logger.debug(`Global shortcut '${globalShortcutAccelerator}' for toggling was registered.`);
			}
		}

		// If the user changed the shortcut via settings we have to handle the unregister and register of the old and new shortcut
		this.settingsController.on("change:globalShortcutAccelerator", (changeInfo) => {
			if (changeInfo.oldValue !== null) {
				globalShortcut.unregister(changeInfo.oldValue);
				logger.debug(`Old global shortcut '${changeInfo.oldValue}' was unregistered.`);
			}

			if (changeInfo.newValue !== null) {
				let isGlobalShortcutRegistered = globalShortcut.register(changeInfo.newValue, () => {
					this.editorViewController.toggleEditorWindowVisibility(this.trayViewController.tray.getBounds());
				});

				if (!isGlobalShortcutRegistered) {
					logger.error("Couldn't register global shortcut for toggling app window!");
				}
				else {
					logger.debug(`Global shortcut '${changeInfo.newValue}' for toggling was registered.`);
				}
			}
		});
	}

	/**
	 * A few session settings to not allow advanced permissions for the browser views (shouldn't be that important for local files, but who knows)
	 */
	setupSessionHandling() {
		session.defaultSession.setDevicePermissionHandler((details) => {
			logger.warn("'setDevicePermissionHandler' was called (see details below). Request will be denied!");
			logger.warn(details);
			return false;
		});

		session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
			logger.warn(`'setPermissionCheckHandler' for permission ${permission} was called from ${requestingOrigin}. Request will be denied!`);
			return false;
		});

		session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
			logger.warn(`'setPermissionRequestHandler' for permission ${permission} was called. Request will be denied!`);
			callback(false);
		});		
	}
};

module.exports = AppController;