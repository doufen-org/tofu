'use strict';
import {Task} from '../service.js';


export default class Mock extends Task {
    async run() {
        console.log('mock running');
    }

    get name() {
        return 'Mock';
    }
}
