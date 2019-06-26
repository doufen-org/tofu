'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_DOULIST = 'https://m.douban.com/rexxar/api/v2/user/{uid}/{type}_doulists?start={start}&count=50&ck={ck}&for_mobile=1';


export default class Doulist extends Task {
    async run() {
        let baseURL = URL_DOULIST
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        for (let type of ['owned', 'following']) {
            let urlWithType = baseURL.replace('{type}', type);
            let pageCount = 1;
            for (let i = 0; i < pageCount; i ++) {
                let response = await this.fetch(urlWithType.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/doulist'}});
                if (response.status != 200) {
                    throw new TaskError('豆瓣服务器返回错误');
                }
                let json = await response.json();
                pageCount = Math.ceil(json.total / PAGE_SIZE);
                for (let doulist of json.doulists) {
                    let row = {
                        id: parseInt(doulist.id),
                        type: type,
                        doulist: doulist,
                    };
                    await this.storage.doulist.put(row);
                }
            }
        }
    }

    get name() {
        return '豆列';
    }
}