'use strict';
import {Task} from '../../service.js';


const URL_FORBID = 'https://www.douban.com/j/contact/addtoblacklist';
const PAGE_SIZE = 100;


export default class Blacklist extends Task {
    async run() {
        this.total = await this.storage.blacklist.count();
        if (this.total == 0) {
            return;
        }

        let postData = new URLSearchParams();
        postData.append('ck', this.session.cookies.ck);

        let pageCount = Math.ceil(this.total / PAGE_SIZE);
        for (let i = 0; i < pageCount; i ++) {
            let rows = await this.storage.blacklist
                .offset(PAGE_SIZE * i).limit(PAGE_SIZE)
                .reverse().toArray();
            for (let row of rows) {
                let uid = row.user.id || row.user.uid;
                postData.set('people', uid);
                let response = await this.fetch(URL_FORBID, {
                    headers: {
                        'X-Override-Referer': 'https://www.douban.com/',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Override-Origin': 'https://www.douban.com',
                    },
                    method: 'POST',
                    body: postData,
                });
                let result = await response.json();
                if (result.result) {
                    this.logger.info('Success to forbid user:' + uid);
                } else {
                    this.logger.warning('Fail to forbid user:' + uid);
                }
                this.step();
            }
        }
        this.complete();
    }

    get name() {
        return '加黑名单';
    }
}
