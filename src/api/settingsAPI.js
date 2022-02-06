const { contextBridge, ipcRenderer } = require("electron");

// We have to pass log messages via ipc to use a centralized logger
const logger = {
	info: (log) => ipcRenderer.invoke("appLog", "info", log),
	warn: (log) => ipcRenderer.invoke("appLog", "warn", log),
	debug: (log) => ipcRenderer.invoke("appLog", "debug", log),
	error: (log) => ipcRenderer.invoke("appLog", "error", log),
	track: (log) => ipcRenderer.invoke("appLog", "track", log)
};

// Extending the window object of the renderer process for additional functionalities, invokes will be handles by the settingsViewController
contextBridge.exposeInMainWorld("APP", {
	getSettingsData: () => ipcRenderer.invoke("getSettingsData"),
	toggleLaunchOnStartup: () => ipcRenderer.invoke("toggleLaunchOnStartup"),
	toggleTheme: () => ipcRenderer.invoke("toggleTheme"),
	openFileDialog: () => ipcRenderer.invoke("openFileDialog"),
	setGlobalShortcut: (shortcutData) => ipcRenderer.invoke("setGlobalShortcut", shortcutData),
	logger: logger
});