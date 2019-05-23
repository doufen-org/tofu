'use strict';
import Task from '../task.js';


export default class Mock extends Task {
    async main(account) {
        console.log(account);
    }
}
