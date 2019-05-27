'use strict';
import {Task} from '../service.js';


const URL_TIMELINE = 'https://m.douban.com/rexxar/api/v2/status/user_timeline/{uid}?max_id={maxId}&ck={ck}&for_mobile=1';

export default class Mock extends Task {
    async run() {
        let userId = this.session.user_id;
        let baseURL = URL_TIMELINE
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', userId);

        let maxId = '', count;
        do {
            let response = await this.fetch(baseURL.replace('{maxId}', maxId), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/statuses'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            count = json.count;
            for (let item of json.items) {
                let status = item.status;
                item.user_id = userId;
                item.id = parseInt(status.id);
                maxId = status.id;
                await this.storage.add('status', item);
            }
        } while (count >= 20);
    }

    get name() {
        return 'Mock';
    }
}
