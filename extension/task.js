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
        await this.storage.put('account', account);
        await this.main(account);
        this._isRunning = false;
    }

    /**
     * Main
     * @param {object} account 
     */
    async main(account) {
        throw new TaskError('Not implemented.');
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
            throw new TaskError('未登录豆瓣');
        }
        let bodyElement = this.createElement(await response.text());
        let inputElement = bodyElement.querySelector('#user');
        let username = inputElement.getAttribute('data-name');
        let userid = inputElement.getAttribute('value');
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
        let cookies = await new Promise(resolve => chrome.cookies.getAll({url: 'https://*.douban.com'}, resolve));
        for (let cookie of cookies) {
            if (cookie.name in cookiesNeeded) {
                cookiesNeeded[cookie.name] = cookie.value;
            }
        }
        return {
            id: parseInt(userid),
            username: username,
            symbol: userSymbol,
            cookies: cookiesNeeded,
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
