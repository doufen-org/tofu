'use strict';
import {TaskError, Task} from '../service.js';


const URL_BLACKLIST = 'https://www.douban.com/contacts/blacklist';


export default class Following extends Task {

    async run() {
        await this.storage.table('version').put({table: 'blacklist', version: this.jobId, updated: Date.now()});
        let response = await this.fetch(URL_BLACKLIST);
        if (response.status != 200) {
            throw new TaskError('豆瓣服务器返回错误');
        }
        let html =  this.parseHTML(await response.text());
    }

    get name() {
        return '关注';
    }
}
