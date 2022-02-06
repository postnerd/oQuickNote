const {Tray, Menu } = require("electron");
const { EventEmitter } = require("events");

const logger = require("../helper/appLogger");

/**
 * The TrayViewController handles setting up the tray icon in the menu bar and the user interaction with it.
 * 
 * User interactions will be emitted so other controllers (especially the appController) can register event handlers.
 */
class TrayViewController extends EventEmitter {
	tray;

	/**
     * Creates the context menu and register event handlers to emit user interactions.
     * 
     * @param {string} iconPath 
     */
	constructor(iconPath) {
		super();

		logger.track("trayViewController:constructor:start");

		this.tray = new Tray(iconPath);
		this.tray.setIgnoreDoubleClickEvents(true);

		const contextMenu = [
			{
				label: "Settings",
				accelerator: "Command+,",
				click: () => {
					this.emit("tray:showSettingsWindow");
				}
			},
			{
				label: "Quit",
				accelerator: "Command+Q",
				click: () => {
					logger.debug("User want's to quit app via tray menu");
					this.emit("tray:quitApp");
				}
			}
		];

		this.tray.on("click", () => {
			this.emit("tray:toggleEditorWindowVisibility");
		});

		this.tray.on("right-click", () => {
			this.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenu));
		});

		logger.track("trayViewController:constructor:end");
	}
}

module.exports = TrayViewController;