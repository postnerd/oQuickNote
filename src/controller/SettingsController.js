const { EventEmitter } = require("events");
const fs = require("fs");

const logger = require("../helper/appLogger");

/**
 * SettingsController stores the user settings. It extends the EventEmitter class so you can register event listeners.
 * 
 * When initialized it checks if the app has already a stored settings file. If so, the controller ensures that the content is valid and updates if necessary.
 * Every time before settings get changed the controller will check if options are valid.
 */
class SettingsController extends EventEmitter {
	#data; // holds complete settings data as a json object
	#settingsPath;
	defaultSettings;
	settingOptions;

	/**
     * Initializing settings controller
     * 
     * @param {string} settingsPath // Path where to find the stored settings file
     * @param {json} defaultSettings // default settings options so we always have valid settings data on startup
     * @param {json} settingOptions // for every setting we have information about what are valid options
     */
	constructor(settingsPath, defaultSettings, settingOptions) {
		super();

		logger.track("settingsController:constructor:start");

		this.#settingsPath = settingsPath;
		this.defaultSettings = defaultSettings;
		this.settingOptions = settingOptions;

		if (fs.existsSync(this.#settingsPath)) {
			logger.debug("Settings file already exists and will be loaded.");
			let savedSettingsData = this.#getSettingsDataFromSettingsFile();

			// Ensure we always have up to date settings data, after adding new settings or if the settings file is broken
			let updatedSettingsData = {...this.defaultSettings, ...savedSettingsData};

			// Ensure to clean old setting data and remove settings that aren't needed anymore
			for (let key in savedSettingsData) {
				if (this.defaultSettings[key] === undefined) {
					logger.debug(`The setting option "${key}" is undefinded and will be deleted.`);
					delete updatedSettingsData[key];
				}
			}

			// If stored settings data misses some new default settings we update the settings file
			if (JSON.stringify(savedSettingsData) !== JSON.stringify(updatedSettingsData)) {
				logger.debug("Settings will be updated because saved settings wasn't up to date.");
				this.#saveSettingsDataToSettingsFile(updatedSettingsData);
			}
			this.#data = updatedSettingsData;
		}
		// When there was no settings file found, we have to create it with default settings
		else {
			logger.debug("No settings file was found. Will save new settings file with default settings.");
			this.#saveSettingsDataToSettingsFile(this.defaultSettings);
			this.#data = this.defaultSettings;
		}

		logger.track("settingsController:constructor:end");
	}

	/**
     * Reading and parsing stored settings file.
     * 
     * @returns Returns stored settings data as json.
     */
	#getSettingsDataFromSettingsFile() {
		let data = {};

		try {
			data = JSON.parse(fs.readFileSync(this.#settingsPath));
		} catch (error) {
			logger.error("Couldn't read or parse settings file content: " + error);
			throw new Error("Couldn't read or parse settings file content: " + error);
		}
		return data;
	}

	/**
     * Public method to retrieve settings data.
     * @returns settings data as json
     */
	getSettingsData = () => {
		logger.debug("Settings data were requested");
		return this.#data;
	};

	/**
     * Should be used before updating settings to ensure we only have valid settings saved.
     * 
     * @param {string} key 
     * @param {*} value 
     * @returns {boolean} Returns if new settings data is valid
     */
	#checkIfSettingsValueIsLegit(key, value) {
		let isLegit = false;

		// Checks for the given key: 
		// 1. if the given value is a valid settings option OR
		// 2. if the passed option can be a string OR
		// 3. if the settings is deleted properly with 'null'
		this.settingOptions[key].forEach((option) => {
			if (option.value === value || (typeof(option.value) === "string" && typeof(value) === "string") || value === null)
			{isLegit = true;}
		});

		return isLegit;
	}

	/**
     * We store given settings data in a json file. We always overwrite the file, this way if the file was deleted during runtime it gets recreated.
     * 
     * @param {json} settingsData 
     */
	#saveSettingsDataToSettingsFile(settingsData) {
		let data = JSON.stringify(settingsData);

		try {
			fs.writeFileSync(this.#settingsPath, data);
		} catch(error) {
			logger.error("Couldn't save settings to settings file: " + error);
			// In case the user tried to change the settings via the settings page this error will be handled by ipcMain, so we have to take care of it in the renderer process.
			// But if the error will be triggered by a programmatic change via the main process this will end the app because a unhandled exception will be thrown and handled by main.js.
			throw new Error("Couldn't save settings to settings file: " + error);
		}

	}

	/**
     * Public method to change settings data. The method will check if the given settings data are valid and throw an error otherwise.
     * This method works synchronous to ensure proper settings data in every app state. 
     * 
     * @param {string} key 
     * @param {*} value 
     */
	changeSetting = (key, value) => {
		let oldValue;

		// Checks if a setting for the given key exits AND the value given is a valid settings option.
		if (this.#data[key] !== undefined && this.#checkIfSettingsValueIsLegit(key, value)) {
			oldValue = this.#data[key];

			// Storing new settings data to settings file and updating settings.
			// We always should try first to save the file with new data and than change the data object in case the fs throws an error
			let tempData = {...this.#data};
			tempData[key] = value;
			this.#saveSettingsDataToSettingsFile(tempData);

			this.#data = tempData;

			logger.debug(`The setting for ${key} was changed from '${oldValue}' to '${value}'. This change will be emitted.`);

			// Emit change message
			this.emit(`change:${key}`, {
				oldValue: oldValue,
				newValue: value
			});
		}
		else {
			logger.error(`SettingsController: Can't find a setting option for '${key}' or the value '${value}' is not legit, so no settings change was saved.`);
			// In case the user tried to change the settings via the settings page this error will be handled by ipcMain, so we have to take care of it in the renderer process.
			// But if the error will be triggered by a programmatic change via the main process this will end the app because a unhandled exception will be thrown and handled by main.js.
			throw new Error(`SettingsController: Can't find a setting option for '${key}' or the value '${value}' is not legit, so no settings change was saved.`);
		}
	};
}

module.exports = SettingsController;