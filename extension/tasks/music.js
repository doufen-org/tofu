'use strict';
import Task from '../task.js';
import {TaskError, URL_INTERESTS, PAGE_SIZE} from '../task.js';


export default class Music extends Task {
    async main(account) {
        let baseURL = URL_INTERESTS
            .replace('{type}', 'music')
            .replace('{ck}', account.cookies.ck)
            .replace('{uid}', account.id);

        this.storage.begin(['music'], 'readwrite');
        for (let type of ['mark', 'doing', 'done']) {
            let semiURL = baseURL.replace('{status}', type);
            let pageCount = 1;
            for (let i = 0; i < pageCount; i ++) {
                let response = await this.fetch(semiURL.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/'}});
                if (response.status != 200) {
                    throw new TaskError('豆瓣服务器返回错误');
                }
                let json = await response.json();
                pageCount = Math.ceil(json.total / PAGE_SIZE);
                for (let row of json.interests) {
                    row.user_id = account.id;
                    await this.storage.put('music', row);
                }
            }
        }
        await this.storage.end();
    }
}
