'use strict';
import {Task} from '../service.js';


const URL_TIMELINE = 'https://m.douban.com/rexxar/api/v2/status/home_timeline?max_id={maxId}&ck={ck}&for_mobile=1';

export default class Mock extends Task {
    async run() {
        let baseURL = URL_TIMELINE
            .replace('{ck}', this.session.cookies.ck);

        let count = 50;
        let maxId = '';
        for (let i = 0; i < count; i ++) {
            let response = await this.fetch(baseURL.replace('{maxId}', maxId), {headers: {'X-Override-Referer': 'https://m.douban.com/status'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            for (let row of json.items) {
                maxId = row.status.id;
                await this.storage.put('timeline', row);
            }
        }
    }

    get name() {
        return 'Mock';
    }
}
