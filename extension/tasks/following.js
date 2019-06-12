'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_FOLLOWING = 'https://m.douban.com/rexxar/api/v2/user/{uid}/following?start={start}&count=50&ck={ck}&for_mobile=1'


export default class Following extends Task {
    async run() {
        await this.storage.table('version').put({table: 'following', version: this.jobId, updated: Date.now()});

        let baseURL = URL_FOLLOWING
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(baseURL.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/followed'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            pageCount = Math.ceil(json.total / PAGE_SIZE);
            for (let row of json.users) {
                row.version = this.jobId;
                await this.storage.following.put(row);
            }
        }
    }

    get name() {
        return '关注';
    }
}
