'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_FOLLOWERS = 'https://m.douban.com/rexxar/api/v2/user/{uid}/followers?start={start}&count=50&ck={ck}&for_mobile=1'


export default class Follower extends Task {
    async run() {
        await this.storage.table('version').put({table: 'follower', version: this.jobId, updated: Date.now()});

        let baseURL = URL_FOLLOWERS
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(baseURL.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/follower'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            pageCount = Math.ceil(json.total / PAGE_SIZE);
            for (let user of json.users) {
                let row = {
                    version: this.jobId,
                    user: user,
                };
                await this.storage.follower.put(row);
            }
        }
    }

    get name() {
        return '被关注';
    }
}
