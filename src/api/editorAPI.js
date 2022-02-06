const { contextBridge, ipcRenderer } = require("electron");

// We have to pass log messages via ipc to use a centralized logger
const logger = {
	info: (log) => ipcRenderer.invoke("appLog", "info", log),
	warn: (log) => ipcRenderer.invoke("appLog", "warn", log),
	debug: (log) => ipcRenderer.invoke("appLog", "debug", log),
	error: (log) => ipcRenderer.invoke("appLog", "error", log),
	track: (log) => ipcRenderer.invoke("appLog", "track", log)
};

// Send information that user used global shortcut to save a note from controller to render process
ipcRenderer.on("saveShortcutPressed", () => {
	window.postMessage("saveNote");
});

// Extending the window object of the renderer process for additional functionalities, invokes will be handles by the editorViewController
contextBridge.exposeInMainWorld("APP", {
	storeNote: (noteData) => ipcRenderer.invoke("storeNote", noteData),
	logger: logger
});