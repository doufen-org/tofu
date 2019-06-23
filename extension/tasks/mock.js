'use strict';
import {Task} from '../service.js';


export default class Mock extends Task {
    async run() {
        const URL_USER_INFO = 'https://m.douban.com/rexxar/api/v2/user/70911218?ck=Ge7W&for_mobile=1'
        let response = await this.fetch(URL_USER_INFO, {headers: {'X-Override-Referer': 'https://m.douban.com/mine/followed'}});
    }

    get name() {
        return 'Mock';
    }
}
