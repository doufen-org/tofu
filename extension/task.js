'use strict';


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
export default class Task {
    /**
     * Run task
     * @param {callback} fetch
     * @param {Storage} storage
     * @param {Logger} logger
     */
    async run(fetch, storage, logger) {
        this.fetch = fetch;
        this.storage = storage;
        this.logger = logger;
        this._isRunning = true;
        let account = await this.signin();
        // TODO:
        this._isRunning = false;
    }

    /**
     * Signin account
     * @returns {object}
     */
    async signin() {
        const URL_MINE = 'https://m.douban.com/mine/';
        let response = await this.fetch(URL_MINE);
        if (response.redirected) {
            window.open(response.url);
            throw new Error('未登录豆瓣');
        }
        let bodyElement = this.createElement(await response.text());
        let inputElement = bodyElement.querySelector('#user');

    }

    /**
     * Whether the task is running
     * @returns {boolean}
     */
    get isRunning() {
        return this._isRunning;
    }

    /**
     * Create DOM
     * @param {string} html 
     * @returns {Element}
     */
    createElement(html) {
        let matches = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
        if (!matches) {
            throw new Error('Response body content not matched');
        }
        let bodyElement = document.createElement('BODY');
        bodyElement.innerHTML = matches[1];
        return bodyElement;
    }

    /**
     * Create a task by name
     * @param {string} name 
     * @param {Array} args 
     * @returns {Task}
     */
    static async create(name, args) {
        let module = await import(`./tasks/${name}.js`);
        let task = new module.default(...args);
        task._isRunning = false;
        return task;
    }
}
