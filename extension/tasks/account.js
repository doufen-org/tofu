'use strict';
import Task from '../task.js';


const URL_MINE = 'https://m.douban.com/mine/';


export default class Account extends Task {

    async run(sleep) {
        let counter = 1;
        while (true) {
            await new Promise(resolve => {
                setTimeout(resolve, 1000);
            });
            await sleep();
            console.log(counter ++);
        }
    }
}
