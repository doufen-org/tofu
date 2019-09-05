'use strict';
import {Task} from '../service.js';
import Drafter from '../vendor/draft.js';


const URL_MOCK = 'https://foo.bar/';


class Mock extends Task {
    async run() {
        let response = await this.fetch(URL_MOCK);
    }

    get name() {
        return 'Mock';
    }
}


export default class Test extends Task {
    async run() {
        let row = await this.storage.note.limit(1);
        let note = this.parseHTML(row.note.fulltext);
        let drafter = new Drafter();
        drafter.feed(note);
        console.log(drafter.toArray());
    }

    get name() {
        return 'Test';
    }
}
