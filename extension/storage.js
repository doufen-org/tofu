'use strict';


const VERSION = 1;

const UPGRADES = [
    database => {
        database.createObjectStore('job', { autoIncrement: true });
        database.createObjectStore('session', { keyPath: 'user_id' });
        database.createObjectStore('status', { keyPath: 'id' })
            .createIndex('sort', ['user_id'], { unique: false });
        database.createObjectStore('following', { keyPath: ['id', 'version'] })
            .createIndex('sort', ['version'], { unique: false });
        database.createObjectStore('follower', { keyPath: ['id', 'version'] })
            .createIndex('sort', ['version'], { unique: false });
        database.createObjectStore('interest', { keyPath: ['id', 'version'] })
            .createIndex('sort', ['version', 'type', 'status'], { unique: false });
    },
];


export default class Storage {
    constructor(name = 'grave', version = VERSION, upgrades = UPGRADES) {
        this.name = name;
        this.version = version;
        this.upgrades = upgrades;
    }

    /**
     * Open database
     * @returns {IDBDatabase}
     */
    async open() {
        return this._database = await new Promise((resolve, reject) => {
            let request = indexedDB.open(this.name, this.version);
            request.addEventListener('success', event => {
                resolve(event.target.result);
            }, { once: true });
            request.addEventListener('error', event => {
                reject(event.target.error);
            }, { once: true });
            request.addEventListener('upgradeneeded', event => {
                let oldVersion = event.oldVersion;
                let newVersion = event.newVersion;
                let request = event.target;
                let database = request.result;
                let transaction = request.transaction;

                for (let i = oldVersion; i < newVersion; i ++) {
                    (this.upgrades[i])(database, transaction);
                }
            }, { once: true });
        });
    }

    /**
     * Get logger
     * @returns {Logger}
     */
    get logger() {
        if (!this._logger) {
            throw new Error('Logger has not initialized.');
        }
        return this._logger;
    }

    /**
     * Set logger
     * @param {Logger} logger 
     */
    set logger(logger) {
        this._logger = logger;
    }

    /**
     * Get database
     * @returns {IDBDatabase}
     */
    get database() {
        if (!this._database) {
            throw new Error('Database has not opened.');
        }
        return this._database;
    }

    /**
     * Close database
     */
    close() {
        return this.database.close();
    }

    /**
     * Get last error
     * @returns {any}
     */
    get lastError() {
        return this._lastError;
    }

    async add(storeName, item, key) {
        try {
            return await this.database.add(storeName, item, key);
        } catch (e) {
            this._lastError = e;
            return false;
        }
    }

    async put(storeName, item, key) {
        try {
            return await this.database.put(storeName, item, key);
        } catch (e) {
            this._lastError = e;
            return false;
        }
    }

    async get(storeName, key) {
        try {
            return await this.database.get(storeName, key);
        } catch (e) {
            this._lastError = e;
            return false;
        }
    }
}
