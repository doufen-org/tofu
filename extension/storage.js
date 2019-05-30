'use strict';
import Dexie from './vendor/dexie.js';


const VERSION = 1;

const UPGRADES = [
    database => {
        database.createObjectStore('job', { autoIncrement: true });
        database.createObjectStore('session', { keyPath: 'userId' });
        database.createObjectStore('status', { keyPath: 'id' })
            .createIndex('sort', ['userId'], { unique: false });
        database.createObjectStore('following', { keyPath: ['id', 'version'] })
            .createIndex('sort', ['version'], { unique: false });
        database.createObjectStore('follower', { keyPath: ['id', 'version'] })
            .createIndex('sort', ['version'], { unique: false });
        database.createObjectStore('interest', { keyPath: ['id', 'version'] })
            .createIndex('sort', ['version', 'type', 'status'], { unique: false });
    },
];


function wrap(request) {
    return new Promise((resolve, reject) => {
        request.addEventListener('success', event => {
            resolve(event.target.result);
        }, { once: true });
        request.addEventListener('error', event => {
            reject(event.target.error);
        }, { once: true });
    });
}


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

    /**
     * Begin transaction
     * @param {string|Array} storeNames 
     * @param {string} mode 
     */
    bulk(storeNames, mode) {
        let transaction = this.database.transaction(storeNames, mode);
        transaction.addEventListener('complete', event => {
            this._transaction = null;
        }, { once: true });
        transaction.addEventListener('error', event => {
            this._transaction = null;
        }, { once: true });
        transaction.addEventListener('abort', event => {
            this._transaction = null;
        }, { once: true });
        this._transaction = transaction;
    }

    /**
     * Abort transaction
     * @returns {boolean}
     */
    abort() {
        if (this._transaction) {
            try {
                this._transaction.abort();
                return true;
            } catch (e) {
                this._lastError = e;
                return false;
            }
        }
        return false;
    }

    /**
     * Add item
     * @param {string} storeName 
     * @param {object} item 
     * @param {string} key 
     * @returns {any}
     */
    async add(storeName, item, key) {
        let store = this.database.transaction(storeName, 'readwrite').objectStore(storeName);
        let request = store.add(item, key);
        try {
            return await wrap(request);
        } catch (e) {
            this._lastError = e;
            return false;
        }
    }

    /**
     * Put item
     * @param {string} storeName 
     * @param {object} item 
     * @param {string} key 
     * @returns {any}
     */
    async put(storeName, item, key) {
        let store = this.database.transaction(storeName, 'readwrite').objectStore(storeName);
        let request = store.put(item, key);
        try {
            return await wrap(request);
        } catch (e) {
            this._lastError = e;
            return false;
        }
    }

    /**
     * Get item
     * @param {string} storeName 
     * @param {string} key 
     * @returns {object}
     */
    async get(storeName, key) {
        let store = this.database.transaction(storeName, 'readonly').objectStore(storeName);
        let request = store.get(key);
        try {
            return await wrap(request);
        } catch (e) {
            this._lastError = e;
            return false;
        }
    }
}
