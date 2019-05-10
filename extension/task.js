'use strict';


/**
 * Class Task
 */
export default class Task {
    /**
     * Run task
     * @param {callback} fetch
     * @param {Storage} storage
     */
    async run(fetch, storage) {
        this.fetch = fetch;
        this.storage = storage;
        this._isRunning = true;
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
            this.log('未登录豆瓣');
            window.open(response.url);
        }
    }

    /**
     * Whether the task is running
     * @returns {boolean}
     */
    get isRunning() {
        return this._isRunning;
    }

    /**
     * Log message
     * @param {string} message 
     * @param {string} level 
     */
    log(message, level='INFO') {
        switch (level) {
            case 'INFO':
            console.info(message);
            break;
            case 'WARN':
            console.warn(message);
            break;
            case 'ERROR':
            console.error(message);
            break;
            default:
            console.log(message);
        }
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
