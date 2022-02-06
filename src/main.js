const appStartTime = Date.now();

const { app } = require("electron");
const AppController = require("./controller/AppController");

const logger = require("./helper/appLogger");

const isDev = process.argv.includes("--isDev");

if (process.argv.includes("--isDebug")) {
	logger.activateDebugMode();
}

logger.setAppStartTime(appStartTime);
logger.track("main:start");

// If there is an uncaughtException than probably something has happened that shouldn't be happening, so it's maybe safer to close the app
process.on("uncaughtException", error => {
	logger.error("Uncaught Exception was thrown: " + error);
	logger.info("App will be exited because of an uncaughtException.");
	logger.track("main:end");
	//@todo We should give the user an info and an option to relaunch the app.
	app.exit();
});

process.on("unhandledRejection", (reason, p) => {
	logger.error("Unhandled Rejection at Promise: " + reason + p);
});

app.on("quit", () => logger.track("main:end"));

logger.info(`${app.getName()} ${app.getVersion()} is starting ${isDev ? "in dev mode ..." : "..."}`);
logger.info(`Using Electron: ${process.versions.electron} Chrome: ${process.versions.chrome} Node: ${process.versions.node}`);

// This controller needs to be global, because it holds all viewController and therefore browserWindow instances and the tray instance. If not, all instances would be GCed.
// eslint-disable-next-line
const appController = new AppController(app, isDev);