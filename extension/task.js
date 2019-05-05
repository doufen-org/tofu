'use strict';


/**
 * Class Task
 */
export default class Task {
    /**
     * Constructor
     * @param {Service} service 
     */
    constructor(service) {
        this._service = service;
    }

    /**
     * Continue task
     */
    continue() {
        if (this._continuation) {
            this._continuation();
        } else {
            throw new Error('Invalid continuation');
        }
    }

    next() {

    }

    /**
     * Run task
     */
    async run() {
        // do something
    }
}
