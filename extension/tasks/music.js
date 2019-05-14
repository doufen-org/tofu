'use strict';
import Task from '../task.js';
import {URL_INTERESTS} from '../task.js';


export default class Music extends Task {
    async main(account) {
        let baseURL = URL_INTERESTS
            .replace('{type}', 'music')
            .replace('{ck}', account.cookies.ck)
            .replace('{uid}', account.id);
        let markURL = baseURL.replace('{status}', 'mark')
            .replace('{start}', 0);
        let response = await this.fetch(markURL, {headers: {Referer: 'https://m.douban.com/'}});
        console.log(await response.json());
    }
}
