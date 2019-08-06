'use strict';
import {TaskError, Task} from '../service.js';


const API_PAGE_SIZE = 50;
const URL_FOLLOWING_API = 'https://m.douban.com/rexxar/api/v2/user/{uid}/following?start={start}&count=50&ck={ck}&for_mobile=1';


export default class Following extends Task {
    async run() {
        this.total = this.targetUser.following_count;
        await this.storage.table('version').put({table: 'following', version: this.jobId, updated: Date.now()});
        
        let baseURL = URL_FOLLOWING_API
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.targetUser.id);

        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(baseURL.replace('{start}', i * API_PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/followed'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            pageCount = Math.ceil(json.total / API_PAGE_SIZE);
            for (let user of json.users) {
                let row = {
                    version: this.jobId,
                    user: user,
                };
                await this.storage.following.put(row);
                this.step();
            }
        }

        this.complete();
    }

    get name() {
        return '关注';
    }
}
