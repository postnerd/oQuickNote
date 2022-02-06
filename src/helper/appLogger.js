const { ipcMain } = require("electron");
const chalk = require("chalk");

/**
 * Used to track certain events in the app. Can be later used for performance analysis or usage research, since also important user interactions can be tracked.
 */
class TrackItem {
	id;
	timeStamp;
	durationSinceStart;

	constructor(id, timeStamp, durationSinceStart) {
		this.id = id;
		this.timeStamp = timeStamp;
		this.durationSinceStart = durationSinceStart;
	}

	getFormattedTrackItem() {
		return `${this.id} | ${this.timeStamp} | ${this.durationSinceStart}`;
	}
}

/**
 * Can be used as a logger. Will be print log messages to console.
 * 
 * @todo support log files
 * @todo export track items
 */
class AppLogger {
	#isDebug = false;
	#trackItems = [];
	#appStartTime;

	/**
     * When a new logger instance is created, the app start time will be set. This timestamp can be changed later on, since the app maybe started way earlier than the logger instance was created.
     * 
     * Also an ipc handler is set so the logger can be used from the renderer process. Therefor you have to make it available to the renderer process via preload script.
     */
	constructor() {
		this.#appStartTime = Date.now();

		ipcMain.handle("appLog", (event, level, log) => {
			switch (level) {
			case "info":
				this.info(log, "renderer");
				break;
			case "warn":
				this.warn(log, "renderer");
				break;
			case "debug":
				this.debug(log, "renderer");
				break;
			case "error":
				this.error(log, "renderer");
				break;
			case "track":
				this.track(log, "renderer");
				break;
			default:
				this.info(log, "renderer");
				break;
			}
		});
	}

	/**
     * No specific log level management is in place. Everything will be printed to the console. Only for debug logs you have to activate the debug mode first.
     */
	activateDebugMode() {
		this.#isDebug = true;
		this.debug("Debug logging is turned on!");
	}

	/**
     * Method to turn off debug mode.
     */
	disableDebugMode() {
		this.debug("Debug logging was turned off!");
		this.#isDebug = false;
	}

	/**
     * You can set the app start time after the logger instance was created, because the app has maybe been running for a while. 
     * Time stamp provided should be created from Date.now() since the track events will be logged with a current time stamp this way.
     * 
     * @param {number} appStartTime time stamp you get from Date.now();
     */
	setAppStartTime(appStartTime) {
		if (typeof(appStartTime) !== "number") {
			throw new Error("Can't set appStartTime because time stamp provided it's not a number.");
		}

		this.#appStartTime = appStartTime;
	}

	/**
     * Method to log a message with info level.
     * 
     * @param {string} log log message
     * @param {string} processName Can be set to any name. If 'undefined' it will be set to "main".
     */
	info(log, processName) {
		console.log(this.#getFormattedLogMessage(log, "INFO", processName));
	}

	/**
     * Method to log a message with warn level.
     * 
     * @param {string} log log message
     * @param {string} processName Can be set to any name. If 'undefined' it will be set to "main".
     */
	warn(log, processName) {
		console.log(chalk.yellow(this.#getFormattedLogMessage(log, "WARN", processName)));
	}

	/**
     * Method to log a message with debug level, but only if debug mode was activated first.
     * 
     * @param {string} log log message
     * @param {string} processName Can be set to any name. If 'undefined' it will be set to "main".
     */
	debug(log, processName) {
		if (this.#isDebug){
			console.log(chalk.blueBright(this.#getFormattedLogMessage(log, "DEBUG", processName)));
		}
	}

	/**
     * Method to log a message with error level.
     * 
     * @param {string} log log message
     * @param {string} processName Can be set to any name. If 'undefined' it will be set to "main".
     */
	error(log, processName) {
		console.log(chalk.red(this.#getFormattedLogMessage(log, "ERROR", processName)));
	}

	/**
     * Method to track an event. This will at an track event to track store and print its infos to the console.
     * 
     * @param {string} id id of the event
     * @param {string} processName Can be set to any name. If 'undefined' it will be set to "main".
     */
	track(id, processName) {
		const timeStamp = Date.now();
		const trackItem = new TrackItem(id, timeStamp, timeStamp - this.#appStartTime);

		this.#trackItems.push(trackItem);

		console.log(chalk.green(this.#getFormattedLogMessage(trackItem.getFormattedTrackItem(), "TRACK", processName)));
	}

	/**
     * Returns a formatted log message that can be printed to console or saved to a log file.
     * 
     * @param {string} log 
     * @param {string} level 
     * @param {string} processName 
     * @returns {string} formatted log message
     */
	#getFormattedLogMessage(log, level, processName) {
		return `${this.#getFormattedDate()} [${processName ? processName : "main"}] [${level}] ${JSON.stringify(log)}`;
	}

	/**
     * Returns an formatted time string, than can be used for log messages.
     * 
     * @returns {string} formatted time string
     */
	#getFormattedDate() {
		let date = new Date();
		return `[${date.toISOString()}]`;
	}
}

// Since we don't want to have different logger instances but just one that we can use from everywhere, we will create an instance here and export it.
const log = new AppLogger();

module.exports = log;