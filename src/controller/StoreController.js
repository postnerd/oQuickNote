const fs = require("fs");
const path = require("path");

const logger = require("../helper/appLogger");

/**
 * StoreController stores given text as a markdown file.
 */
class StoreController {
	#storePath;

	/**
     * Sets the path where the notes should be stored in the future and tries to create a directory for it.
     * 
     * @param {string} storePath 
     */
	constructor(storePath) {
		logger.track("storeController:constructor:start");

		this.setStorePath(storePath);

		// Even if we will do this every time we store a note, it's good to do this before even storing a note to show some presents, so the users can see for themselves where the notes will be stored.
		this.#createNoteDirectoryIfNeeded();

		logger.track("storeController:constructor:end");
	}

	/**
     * Public method to set the path where the notes should be stored.
     * 
     * @param {string} newStorePath 
     */
	setStorePath(newStorePath) {
		this.#storePath = newStorePath;
		logger.debug(`Path for storing notes was set to '${newStorePath}.'`);
	}

	/**
     * Tries to create the directory for the notes. Should be run every time we want to store a note, so we can be sure there is a proper directory for the notes.
     */
	#createNoteDirectoryIfNeeded() {
		if (!fs.existsSync(this.#storePath)) {
			try {
				fs.mkdirSync(this.#storePath, { recursive: true });
				logger.debug(`Created directory for notes at '${this.#storePath}'.`);
			} catch(error) {
				logger.error("Couldn't create directory for notes: " + error);
				throw new Error(error);
			}
		}
	}

	/**
     * Saves the note to the file system. Will throw an error, if this can't be done. 
     * Because the storing is triggered via ipc it will handle the error and we don't have to quit the app.
     * Instead user should get the chance to change something to prevent this from happening again.
     * 
     * @param {string} filePath path and file name for the note
     * @param {string} storeData content of the note
     */
	#writeNoteFile(filePath, storeData) {
		// Before we store the note, we will make sure, that there is a directory for it, because the user could have deleted it during runtime
		this.#createNoteDirectoryIfNeeded();

		try {
			// Since we have detailed time information in the title of the note including seconds we don't have to check, if the file already exits, because it should be impossible for a user to save two notes in one second.
			fs.writeFileSync(filePath, storeData);
			logger.debug(`Saved note at '${filePath}'.`);
		} catch (error) {
			logger.error("Couldn't save note: " + error);
			throw new Error(error);
		}
	}

	/**
     * Generates a file name for the note which will contain date information if now specific title was provided.
     * 
     * @returns {string} file name for the note
     */
	#generateFileName(title) {
		let fileName;

		if (title) {
			fileName = title + ".md";
		}
		else {
			let date = new Date();

			fileName =
            "Note_" +
            date.getFullYear() +
            "-" +
            ("0" + (date.getMonth() + 1)).slice(-2) +
            "-" +
            ("0" + date.getDate()).slice(-2) +
            "_" +
            ("0" + date.getHours()).slice(-2) +
            "-" +
            ("0" + date.getMinutes()).slice(-2) +
            "-" +
            ("0" + date.getSeconds()).slice(-2) +
            ".md";
		}

		return fileName;
	}

	/**
     * Public method to save a note as a markdown file.
     * 
     * Storing a note will be done synchronously.
     * 
     * @param {string} storeData content of the note to save
     * @returns {Promise<object>} Promise with information where the note was stored
     */
	storeNote = (storeData, title) => {
		const filePath = path.join(this.#storePath, this.#generateFileName(title));

		return new Promise((resolve, reject) => {
			try {
				this.#writeNoteFile(filePath, storeData);
				resolve({
					filePath: filePath
				});
			} catch (error) {
				reject({
					filePath: filePath
				});
			}
		});
	};
}

module.exports = StoreController;