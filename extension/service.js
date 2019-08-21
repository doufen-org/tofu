'use strict';
import Settings from './settings.js';
import Storage from './storage.js';


/**
 * Service settings
 */
export const SERVICE_SETTINGS = {
    'service.debug': false,
    'service.requestInterval': 1000,
    'service.cloudinary': '',
};


/**
 * Class TaskError
 */
export class TaskError extends Error {
    constructor(message) {
        super(message);
    }
}


/**
 * Class Task
 */
export class Task {
    /**
     * Initialize the task
     * @param {callback} fetch
     * @param {Logger} logger
     * @param {callback} parseHTML
     * @param {number} jobId
     * @param {Object} session
     * @param {Dexie} localStorage
     * @param {Object} targetUser
     * @param {boolean} isOtherUser
     */
    init(fetch, logger, parseHTML, jobId, session, localStorage, targetUser, isOtherUser) {
        this.fetch = fetch;
        this.logger = logger;
        this.parseHTML = parseHTML;
        this.jobId = jobId;
        this.session = session;
        this.storage = localStorage;
        this.targetUser = targetUser;
        this.isOtherUser = isOtherUser;
        this.total = 1;
        this.completion = 0;
    }

    /**
     * Run task
     */
    async run() {
        throw new TaskError('Not implemented.');
    }

    /**
     * Convert to JSON string
     * @returns {string}
     */
    toJSON() {
        return this.name;
    }

    /**
     * Get task name
     * @returns {string}
     */
    get name() {
        throw new TaskError('Not implemented.');
    }

    /**
     * Task completed
     */
    complete() {
        this.completion = this.total;
    }

    /**
     * Progress step
     */
    step() {
        this.completion += 1;
    }
}


/**
 * Parse HTML
 * @param {string} html 
 * @param {string} url 
 */
function parseHTML(html, url) {
    let context = document.implementation.createHTMLDocument('');
    context.documentElement.innerHTML = html;
    let base = context.createElement('base');
    base.href = url;
    context.head.appendChild(base);
    return context;
}


/**
 * Class Job
 */
class Job extends EventTarget {
    /**
     * Constructor
     * @param {Service} service 
     * @param {string|null} userId 
     */
    constructor(service, userId) {
        super();
        this._service = service;
        this._userId = userId;
        this._tasks = [];
        this._isRunning = false;
        this._currentTask = null;
        this._id = null;
        this._session = null;
    }

    /**
     * Get user info
     * @param {callback} fetch 
     * @param {Object} cookies 
     * @param {string} userId 
     */
    async getUserInfo(fetch, cookies, userId) {
        const URL_USER_INFO = 'https://m.douban.com/rexxar/api/v2/user/{uid}?ck={ck}&for_mobile=1';

        let userInfoURL = URL_USER_INFO
            .replace('{uid}', userId)
            .replace('{ck}', cookies.ck);
        return await (
            await fetch(userInfoURL, {headers: {'X-Override-Referer': 'https://m.douban.com/'}})
        ).json();
    }

    /**
     * Checkin account
     * @param {callback} fetch 
     * @returns {object}
     */
    async checkin(fetch) {
        const URL_MINE = 'https://m.douban.com/mine/';

        let response = await fetch(URL_MINE);
        if (response.redirected) {
            window.open(response.url);
            throw new TaskError('未登录豆瓣');
        }
        let bodyElement = parseHTML(await response.text(), URL_MINE);
        let inputElement = bodyElement.querySelector('#user');
        let username = inputElement.getAttribute('data-name');
        let uid = inputElement.getAttribute('value');
        let homepageLink = bodyElement.querySelector('.profile .detail .basic-info>a');
        let homepageURL = homepageLink.getAttribute('href');
        let userSymbol = homepageURL.match(/\/people\/(.+)/).pop();
        let cookiesNeeded = {
            'ue': '',
            'bid': '',
            'frodotk_db': '',
            'ck': '',
            'dbcl2': '',
        };
        let cookies = await new Promise(
            resolve => chrome.cookies.getAll({url: 'https://*.douban.com'}, resolve)
        );
        for (let cookie of cookies) {
            if (cookie.name in cookiesNeeded) {
                cookiesNeeded[cookie.name] = cookie.value;
            }
        }

        let userInfo = await this.getUserInfo(fetch, cookiesNeeded, uid);

        return this._session = {
            userId: parseInt(uid),
            username: username,
            userSymbol: userSymbol,
            cookies: cookiesNeeded,
            userInfo: userInfo,
            updated: Date.now(),
            isOther: false
        }
    }

    /**
     * Add a task
     * @param {Task} task 
     */
    addTask(task) {
        this._tasks.push(task);
    }

    /**
     * Run the job
     * @param {callback} fetch 
     * @param {Logger} logger 
     */
    async run(fetch, logger) {
        this._isRunning = true;
        let session = await this.checkin(fetch);

        let userId, account, targetUser, isOtherUser = false;
        if (this._userId) {
            let userInfo = await this.getUserInfo(fetch, session.cookies, this._userId);
            this._userId = userId = parseInt(userInfo.id);
            account = {
                userId: userId,
                username: userInfo.name,
                userSymbol: userInfo.uid,
                cookies: null,
                userInfo: userInfo,
                updated: Date.now(),
                isOther: true
            };
            targetUser = userInfo;
            isOtherUser = true;
        } else {
            userId = session.userId;
            account = session;
            targetUser = session.userInfo;
        }

        let storage = new Storage(userId);
        await storage.global.open();
        logger.debug('Open global database');
        await storage.global.account.put(account);
        logger.debug('Create the account');
        let jobId = await storage.global.job.add({
            userId: userId,
            created: Date.now(),
            progress: {},
            tasks: JSON.parse(JSON.stringify(this._tasks)),
        });
        logger.debug('Create the job');
        storage.global.close();
        logger.debug('Close global database');

        await storage.local.open();
        logger.debug('Open local database');
        this._id = jobId;
        for (let task of this._tasks) {
            this._currentTask = task;
            task.init(
                fetch,
                logger,
                parseHTML,
                jobId,
                session,
                storage.local,
                targetUser,
                isOtherUser
            );
            try {
                await task.run();
            } catch (e) {
                logger.error('Fail to run task:' + e);
            }
        }
        storage.local.close();
        logger.debug('Close local database');
        this._currentTask = null;
        this._isRunning = false;
    }

    /**
     * Whether the job is running
     * @returns {boolean}
     */
    get isRunning() {
        return this._isRunning;
    }

    /**
     * Get current task
     * @returns {Task|null}
     */
    get currentTask() {
        return this._currentTask;
    }

    /**
     * Get tasks
     * @returns {Array}
     */
    get tasks() {
        return this._tasks;
    }

    /**
     * Get job id
     * @returns {number|null}
     */
    get id() {
        return this._id;
    }
}


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
    /**
     * Constructor
     */
    constructor() {
        super();
        Object.assign(this, {
            STATE_STOPPED: 1,
            STATE_START_PENDING: 2,
            STATE_STOP_PENDING: 3,
            STATE_RUNNING: 4
        });
        this._currentJob = null;
        this._ports = new Map();
        this._jobQueue = new AsyncBlockingQueue();
        this._status = this.STATE_STOPPED;
        this.lastRequest = 0;
        chrome.runtime.onConnect.addListener(port => this.onConnect(port));
    }

    /**
     * Load settings
     */
    async loadSettings() {
        let settings = await Settings.load(SERVICE_SETTINGS);
        Settings.apply(this, settings);
        this.logger.debug('Service settings loaded.');
        return this;
    }

    /**
     * Get name
     */
    get name() {
        return 'service';
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
        this.logger.debug('Starting service...');
        if (this._continuation) {
            this._continuation();
        }
        return true;
    }

    /**
     * Stop handling task queue
     */
    stop() {
        let originalState = this._status;

        switch (originalState) {
            case this.STATE_RUNNING:
            this._status = this.STATE_STOP_PENDING;
            this.dispatchEvent(new StateChangeEvent(originalState, this._status));
            this.logger.debug('Stopping service...');    
            break;

            case this.STATE_START_PENDING:
            this._status = this.STATE_STOPPED;
            this.dispatchEvent(new StateChangeEvent(originalState, this._status));
            this.logger.debug('Service stopped.');
            break;

            default:
            return false;
        }
        return true;
    }

    /**
     * Create a job
     * @param  {string} userId 
     * @param  {Array} tasks 
     */
    async createJob(userId, tasks) {
        this.logger.debug('Creating a job...');
        let job = new Job(this, userId);
        for (let {name, args} of tasks) {
            try {
                let module = await import(`./tasks/${name}.js`);
                if (typeof args == 'undefined') {
                    args = [];
                }
                let task = new module.default(...args);
                job.addTask(task);
            } catch (e) {
                this.logger.error('Fail to create task:' + e);
            }
        }
        this._jobQueue.enqueue(job);
        return job;
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
                    this._status = this.STATE_RUNNING;
                    this.dispatchEvent(new StateChangeEvent(originalState, this._status));
                    this.logger.debug('Service started.');
                    resolve();
                };
                break;

            case this.STATE_STOP_PENDING:
                executor = resolve => {
                    this._status = this.STATE_STOPPED;
                    this.dispatchEvent(new StateChangeEvent(originalState, this._status));
                    this.logger.debug('Service stopped.');
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
        switch (originalState) {
            case this.STATE_RUNNING:
                this._status = this.STATE_START_PENDING;
                this.dispatchEvent(new StateChangeEvent(originalState, this._status));
                this.logger.debug('Service is pending...');

            case this.STATE_START_PENDING:
                return Promise.resolve();
        }
        return this.continue();
    }

    /**
     * Get current job
     * @returns {Job|null}
     */
    get currentJob() {
        return this._currentJob;
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

        let service = await Service.instance.loadSettings();
        let logger = service.logger;

        let browserMainVersion = (/Chrome\/([0-9]+)/.exec(navigator.userAgent)||[,0])[1];
        let extraOptions = (browserMainVersion >= 72) ? ['blocking', 'requestHeaders', 'extraHeaders'] : ['blocking', 'requestHeaders'];

        chrome.webRequest.onBeforeSendHeaders.addListener(details => {
            let overrideHeaderTag = 'X-Override-';
            for (let header of details.requestHeaders) {
                if (header.name.startsWith(overrideHeaderTag)) {
                    header.name = header.name.substr(overrideHeaderTag.length);
                }
            }
            return {requestHeaders: details.requestHeaders};
        }, {urls: ['http://*.douban.com/*', 'https://*.douban.com/*']}, extraOptions);
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
            promise = promise.then(() => {
                let url = Request.prototype.isPrototypeOf(resource) ? resource.url : resource.toString();
                lastRequest = Date.now();
                logger.debug(`Fetching ${url}...`, resource);
                return fetch(resource, init);
            });
            service.dispatchEvent(new Event('progress'));
            return promise;
        };

        while (RUN_FOREVER) {
            await service.ready();
            if (!service._currentJob) {
                logger.debug('Waiting for the job...');
                service._currentJob = await service._jobQueue.dequeue();
            }
            try {
                await service.continue();
                logger.debug('Performing job...');
                await service._currentJob.run(fetchURL, logger);
                logger.debug('Job completed...');
                service._currentJob = null;
            } catch (e) {
                logger.error(e);
                service.stop();
            }
        }
    }
}
