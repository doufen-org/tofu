'use strict';


/**
 * Class Task
 */
export default class Task {
    /**
     * Run task
     */
    async run() {
        throw new Error('Not implemented');
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
