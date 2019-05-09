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
        throw new Error('Not implemented');
    }

    log(message, level='INFO') {

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
        return new module.default(...args);
    }
}
