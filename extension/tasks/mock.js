'use strict';
import {Task} from '../service.js';


export default class Mock extends Task {
    async run() {
        console.log(`job id: ${this.jobId}`);
        console.log(`storage tables: ${this.storage.tables}`);
    }

    get name() {
        return 'Mock';
    }
}
