'use strict';
import Task from '../task.js';
import {TaskError, URL_INTERESTS, PAGE_SIZE} from '../task.js';


export default class Interest extends Task {
    async main(account) {
        let baseURL = URL_INTERESTS
            .replace('{ck}', account.cookies.ck)
            .replace('{uid}', account.id);

        for (let type of ['music', 'book', 'movie']) {
            let urlWithType = baseURL.replace('{type}', type);

            for (let status of ['mark', 'doing', 'done']) {
                let urlWithStatus = urlWithType.replace('{status}', status);
                let pageCount = 1;
                for (let i = 0; i < pageCount; i ++) {
                    let response = await this.fetch(urlWithStatus.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/' + type}});
                    if (response.status != 200) {
                        throw new TaskError('豆瓣服务器返回错误');
                    }
                    let json = await response.json();
                    pageCount = Math.ceil(json.total / PAGE_SIZE);
                    for (let row of json.interests) {
                        row.user_id = account.id;
                        row.type = type;
                        await this.storage.put('interest', row);
                    }
                }
            }
        }
    }
}
