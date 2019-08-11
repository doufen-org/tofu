'use strict';
import {TaskError, Task} from '../service.js';


const URL_TIMELINE = 'https://m.douban.com/rexxar/api/v2/status/user_timeline/{uid}?max_id={maxId}&ck={ck}&for_mobile=1';
const URL_STATUS = 'https://m.douban.com/rexxar/api/v2/status/{id}?ck={ck}&for_mobile=1';


export default class Status extends Task {
    async fetchStatusFulltext(id) {
        let url = URL_STATUS
            .replace('{ck}', this.session.cookies.ck)
            .replace('{id}', id);
        let response = await this.fetch(url, {headers: {'X-Override-Referer': 'https://m.douban.com/mine/statuses'}});
        if (response.status != 200) {
            throw new TaskError('豆瓣服务器返回错误');
        }
        return await response.json();
    }

    async run() {
        let version = this.jobId;
        this.total = this.targetUser.statuses_count;
        if (this.total == 0) {
            return;
        }
        let lastStatusId = '';
        await this.storage.transaction('rw', this.storage.table('version'), async () => {
            let verTable = this.storage.table('version');
            let row = await verTable.get('status');
            if (row) {
                lastStatusId = row.lastId;
                await verTable.update('status', {version: version, updated: Date.now()});
            } else {
                await verTable.add({table: 'status', version: version, updated: Date.now()});
            }
        })

        let baseURL = URL_TIMELINE
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.targetUser.id);

        let count, retried = false;
        do {
            let response = await this.fetch(baseURL.replace('{maxId}', lastStatusId), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/statuses'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            count = json.items.length;
            for (let item of json.items) {
                let status = item.status;
                item.id = parseInt(status.id);
                item.created = Date.now();
                lastStatusId = status.id;
                if (status.text.length >= 140 && status.text.substr(-3, 3) == '...') {
                    item.status = await this.fetchStatusFulltext(lastStatusId);
                }
                try {
                    await this.storage.status.add(item);
                } catch (e) {
                    if (retried) {
                        if (e.name == 'ConstraintError') {
                            this.logger.debug(e.message);
                            this.complete();
                            return;
                        }
                        throw e;
                    } else {
                        retried = true;
                        count = 0;
                        break;
                    }
                }
                await this.storage.table('version').update('status', { lastId: item.id });
                this.step();
            }
        } while (count > 0 || (lastStatusId = '') == '');
        this.complete();
    }

    get name() {
        return '广播';
    }
}
