'use strict';
import Task from './task.js';
import Storage from './storage.js';


/**
 * Service settings
 */
const SERVICE_SETTINGS = [
    'service.debug',
    'service.requestInterval',
];


/**
 * Class Logger
 */
class Logger extends EventTarget {
    /**
     * Constructor
     */
    constructor() {
        super();
        Object.assign(this, {
            LEVEL_CRITICAL: 50,
            LEVEL_ERROR: 40,
            LEVEL_WARNING: 30,
            LEVEL_INFO: 20,
            LEVEL_DEBUG: 10,
            LEVEL_NOTSET: 0,
        });
        this._level = this.LEVEL_INFO;
        this.entries = [];
    }

    /**
     * Log error
     * @param {string} message 
     * @param {any} context 
     * @returns {object}  
     */
    error(message, context = null) {
        return this.log(this.LEVEL_ERROR, message, context);
    }

    /**
     * Log warning
     * @param {string} message 
     * @param {any} context 
     * @returns {object} 
     */
    warning(message, context = null) {
        return this.log(this.LEVEL_WARNING, message, context);
    }

    /**
     * Log info
     * @param {string} message 
     * @param {any} context 
     * @returns {object} 
     */
    info(message, context = null) {
        return this.log(this.LEVEL_INFO, message, context);
    }

    /**
     * Log debug info
     * @param {string} message 
     * @param {any} context 
     * @returns {object} 
     */
    debug(message, context = null) {
        return this.log(this.LEVEL_DEBUG, message, context);
    }

    /**
     * Log message
     * @param {number} level 
     * @param {string} message 
     * @param {any} context 
     * @returns {object} 
     */
    log(level, message, context = null) {
        if (this._level > level) return;
        let levelName;
        switch (level) {
            case this.LEVEL_DEBUG:
            levelName = 'DEBUG';
            break;
            case this.LEVEL_INFO:
            levelName = 'INFO';
            break;
            case this.LEVEL_WARNING:
            levelName = 'WARNING';
            break;
            case this.LEVEL_ERROR:
            levelName = 'ERROR';
            break;
            case this.LEVEL_CRITICAL:
            levelName = 'CRITICAL';
            break;
            default:
            levelName = 'UNKNOWN';
        }
        let entry = {
            time: Date.now(),
            level: level,
            levelName: levelName,
            message: message,
            context: context,
        };
        let cancelled = !this.dispatchEvent(new CustomEvent('log', {detail: entry}));
        if (cancelled) {
            return entry;
        }
        return this.entries.push(entry);
    }

    /**
     * Get default level
     * @returns {number}
     */
    get level() {
        return this._level;
    }

    /**
     * Set default level
     * @param {number} value
     */
    set level(value) {
        this._level = value;
    }
}


/**
 * Class AsyncBlockingQueue
 */
class AsyncBlockingQueue {
    constructor() {
        this.resolves = [];
        this.promises = [];
    }

    _add() {
        this.promises.push(
            new Promise(resolve => {
                this.resolves.push(resolve);
            })
        );
    }

    enqueue(item) {
        if (!this.resolves.length) this._add();
        let resolve = this.resolves.shift();
        resolve(item);
    }

    dequeue() {
        if (!this.promises.length) this._add();
        return this.promises.shift();
    }

    isEmpty() {
        return !this.promises.length;
    }

    isBlocked() {
        return !!this.resolves.length;
    }

    clear() {
        this.promises.length = 0;
    }

    get length() {
        return (this.promises.length - this.resolves.length);
    }
}


/**
 * Class StateChangeEvent
 */
class StateChangeEvent extends Event {
    constructor(originalState, currentState) {
        super('statechange');
        this.originalState = originalState;
        this.currentState = currentState;
    }
}


/**
 * Class Service
 */
export default class Service extends EventTarget {
    constructor() {
        super();
        Object.assign(this, {
            STATE_STOPPED: 1,
            STATE_START_PENDING: 2,
            STATE_STOP_PENDING: 3,
            STATE_RUNNING: 4
        });
        this._ports = new Map();
        this._taskQueue = new AsyncBlockingQueue();
        this._status = this.STATE_STOPPED;
        this._debug = false;
        this.requestInterval = 1000;
        this.lastRequest = 0;
        chrome.runtime.onConnect.addListener(port => this.onConnect(port));
    }

    /**
     * Get debug mode
     * @returns {boolean} 
     */
    get debug() {
        return this._debug;
    }

    /**
     * Set debug mode
     * @param {boolean} value
     */
    set debug(value) {
        if (this._debug = !!value) {
            let logger = this.logger;
            logger.level = logger.LEVEL_DEBUG;
            logger.addEventListener('log', event => {
                let entry = event.detail;
                let datetime = new Date(entry.time).toISOString();
                console.log(`[${datetime}] ${entry.levelName}: ${entry.message}`);
            })
        }
    }

    /**
     * Get logger
     * @returns {Logger} 
     */
    get logger() {
        let logger = this._logger;
        if (!logger) {
            this._logger = logger = new Logger();
        }
        return logger;
    }

    /**
     * Set settings
     * @param {object} settings
     */
    set settings(settings) {
        for (let key in settings) {
            try {
                let keyPath = key.split('.');
                if (keyPath.shift() != 'service') {
                    continue;
                }
                let lastNode = keyPath.pop();
                let target = this;
                for (let node of keyPath) {
                    target = target[node];
                }
                target[lastNode] = settings[key];
            } catch (e) {}
        }
    }

    /**
     * Get port unique name
     * @param {chrome.runtime.Port} port 
     * @returns {string}
     */
    getPortName(port) {
        let tab = port.sender.tab;
        return `${port.name}-${tab.windowId}-${tab.id}`;
    }

    /**
     * On connect
     * @param {chrome.runtime.Port} port 
     */
    onConnect(port) {
        this._ports.set(this.getPortName(port), port);
        port.onMessage.addListener(message => this.onMessage(port, message));
        port.onDisconnect.addListener(port => this.onDisconnect(port));
    }

    /**
     * On disconnect
     * @param {chrome.runtime.Port} port 
     */
    onDisconnect(port) {
        this._ports.delete(this.getPortName(port));
    }

    /**
     * On receive message
     * @param {chrome.runtime.Port} port 
     * @param {any} message 
     */
    onMessage(port, message) {
        switch (message.type) {
            case 'syscall':
            let retVal = this[message.method].apply(this, message.args);
            port.postMessage({
                type: message.type,
                id: message.id,
                return: retVal
            });
            break;
        }
    }

    /**
     * Post message
     * @param {chrome.runtime.Port} port 
     * @param {any} message 
     */
    postMessage(port, message) {
        try {
            return port.postMessage(message);
        } catch (e) {
            return false;
        }
    }

    /**
     * Broadcast message
     * @param {any} message 
     */
    broadcast(message) {
        for (let port of this._ports.values()) {
            this.postMessage(port, message);
        }
    }

    /**
     * Ping test
     * @param {any} payload 
     * @returns {string}
     */
    ping(payload) {
        return {'pang': payload};
    }

    /**
     * Get status code
     * @return {number}
     */
    get status() {
        return this._status;
    }

    /**
     * Start handling task queue
     */
    start() {
        let originalState = this._status;
        if (originalState != this.STATE_STOPPED) return false;
        this._status = this.STATE_START_PENDING;
        this.dispatchEvent(new StateChangeEvent(originalState, this._status));
        if (this._continuation) {
            this._continuation();
        }
        this.logger.debug('Starting service...');
        return true;
    }

    /**
     * Stop handling task queue
     */
    stop() {
        let originalState = this._status;
        if (originalState != this.STATE_RUNNING && originalState != this.STATE_START_PENDING) return false;
        this._status = this.STATE_STOP_PENDING;
        this.dispatchEvent(new StateChangeEvent(originalState, this._status));
        this.logger.debug('Stopping service...');
        return true;
    }

    /**
     * Emit a task
     * @param {string} task 
     * @param {Array | null} args 
     * @returns {Service}
     */
    emit(task, args = null) {
        this.logger.debug(`Add task "${task}"`, args);
        this._taskQueue.enqueue({
            name: task,
            args: Array.isArray(args) ? args : []
        });
    }

    /**
     * Continue the task
     */
    continue() {
        let executor, originalState = this._status;

        switch (originalState) {
            case this.STATE_RUNNING:
            return Promise.resolve();

            case this.STATE_START_PENDING:
            executor = resolve => {
                this.logger.debug('Service started.');
                this._status = this.STATE_RUNNING;
                this.dispatchEvent(new StateChangeEvent(originalState, this._status));
                resolve();
            };
            break;

            case this.STATE_STOP_PENDING:
            executor = resolve => {
                this.logger.debug('Service stopped.');
                this._status = this.STATE_STOPPED;
                this.dispatchEvent(new StateChangeEvent(originalState, this._status));
                this._continuation = resolve;
            };
            break;

            case this.STATE_STOPPED:
            executor = resolve => this._continuation = resolve;
        }

        return new Promise(executor);
    }

    /**
     * Get ready for running task
     */
    ready() {
        let originalState = this._status;
        if (originalState == this.STATE_RUNNING) {
            this._status = this.STATE_START_PENDING;
            this.dispatchEvent(new StateChangeEvent(originalState, this._status));
            return Promise.resolve();
        }
        return this.continue();
    }

    /**
     * Get singleton instance
     * @returns {Service}
     */
    static get instance() {
        if (!Service._instance) {
            Service._instance = new Service();
        }
        return Service._instance;
    }

    /**
     * Startup service
     * @returns {Service}
     */
    static async startup() {
        const RUN_FOREVER = true;

        let service = Service.instance;
        let logger = service.logger;

        service.settings = await new Promise(resolve => {
            chrome.storage.sync.get(SERVICE_SETTINGS, resolve);
        });
        logger.debug('Service settings loaded.');

        let lastRequest = 0;
        let fetchURL = (resource, init) => {
            let promise = service.continue();
            let requestInterval = lastRequest + service.requestInterval - Date.now();
            if (requestInterval > 0) {
                promise = promise.then(() => {
                    return new Promise(resolve => {
                        setTimeout(resolve, requestInterval);
                    });
                });
            }
            return promise.then(() => {
                let url = Request.prototype.isPrototypeOf(resource) ? resource.url : resource.toString();
                lastRequest = Date.now();
                logger.debug(`Fetching ${url}...`, resource);
                return fetch(resource, init);
            });
        };

        let storage = new Storage('grave');
        let currentTask;
        while (RUN_FOREVER) {
            await service.ready();
            if (typeof currentTask == 'undefined') {
                logger.debug('Waiting for task...');
                let taskArgs = await service._taskQueue.dequeue();
                currentTask = await Task.create(taskArgs.name, taskArgs.args);
            }
            try {
                logger.debug('Performing task...');
                await currentTask.run(fetchURL, storage, logger);
                logger.debug('Task completed...');
                currentTask = undefined;
            } catch (e) {
                logger.error(e.name + ': ' + e.message);
                service.stop();
            }
        }

    }
}
