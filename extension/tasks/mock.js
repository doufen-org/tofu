'use strict';
import {Task} from '../service.js';


const URL_MOCK = 'https://foo.bar/';


export default class Mock extends Task {
    async run() {
        let response = await this.fetch(URL_MOCK);
    }

    get name() {
        return 'Mock';
    }
}
