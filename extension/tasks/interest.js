'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_INTERESTS = 'https://m.douban.com/rexxar/api/v2/user/{uid}/interests?type={type}&status={status}&start={start}&count=50&ck={ck}&for_mobile=1';
const URL_TOTAL = 'https://m.douban.com/rexxar/api/v2/user/{uid}/interests?ck={ck}&for_mobile=1';


export default class Interest extends Task {
    async getTotal() {
        let totalURL = URL_TOTAL
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);
        let response = await this.fetch(totalURL, {headers: {'X-Override-Referer': 'https://m.douban.com/mine/'}});
        if (response.status != 200) {
            throw new TaskError('豆瓣服务器返回错误');
        }
        let json = await response.json();
        return parseInt(json.total);
    }

    async run() {
        this.total = await this.getTotal();
        await this.storage.table('version').put({table: 'interest', version: this.jobId, updated: Date.now()});

        let baseURL = URL_INTERESTS
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        for (let type of ['game', 'music', 'book', 'movie']) {
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
                    for (let interest of json.interests) {
                        let row = {
                            id: parseInt(interest.id),
                            version: this.jobId,
                            type: type,
                            status: interest.status,
                            interest: interest,
                        };
                        await this.storage.interest.put(row);
                        this.step();
                    }
                }
            }
        }
        delete this._name;
        this.complete();
    }

    get name() {
        return '书/影/音/游';
    }
}
