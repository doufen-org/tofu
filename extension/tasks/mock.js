'use strict';
import Task from '../services/Task.js';
import TaskError from '../services/TaskError.js';
import Drafter from '../vendor/draft.js';


const URL_MOCK = 'https://foo.bar/';


class Mock extends Task {
    async run() {
        let fetch = await this.fetch
        let response = await fetch(URL_MOCK);
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
