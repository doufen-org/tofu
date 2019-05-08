'use strict';
import Task from '../task.js';


const URL_MINE = 'https://m.douban.com/mine/';


export default class Account extends Task {

    async run(fetch, storage) {
        try {
            let response = await fetch(URL_MINE);
            let element = this.createElement(await response.text());
            let inputElement = element.querySelector('#user');
            let username = inputElement.getAttribute('data-name');
            let userid = inputElement.getAttribute('value');
            //let symbol = inputElement;
            console.log(`${userid}: ${username}`);
        } catch (e) {
            console.log(e);
        }
    }
}
