'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_INTERESTS = 'https://m.douban.com/rexxar/api/v2/user/{uid}/interests?type={type}&status={status}&start={start}&count={count}&ck={ck}&for_mobile=1';
const URL_TOTAL = 'https://m.douban.com/rexxar/api/v2/user/{uid}/interests?ck={ck}&count=1&for_mobile=1';


export default class Interest extends Task {
    async getTotal() {
        let totalURL = URL_TOTAL
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.targetUser.id);
        let response = await this.fetch(totalURL, {headers: {'X-Override-Referer': 'https://m.douban.com/mine/'}});
        if (response.status != 200) {
            throw new TaskError('豆瓣服务器返回错误');
        }
        let json = await response.json();
        return parseInt(json.total);
    }

    compareInterest(l, r) {
        if (l.status != r.status) return false;
        if (l.comment != r.comment) return false;
        if (l.rating != r.rating) {
            if (l.rating && r.rating) {
                if (l.rating.value != r.rating.value) {
                    return false;
                }
            } else {
                return false;
            }
        }
        if (l.tags.sort().toString() != r.tags.sort().toString()) return false;
        return true;
    }

    async processInterest(interest, version, type)
    {
        if (!interest.subject) {
            console.warn("Encountered malformed interest, skipping");
            return;
        }        
        let subjectId = parseInt(interest.subject.id)
        let interestId = parseInt(interest.id);
        let row = await this.storage.interest.get({ subject: subjectId });
        if (row) {
            let lastVersion = row.version;
            let changed = false;
            row.version = version;
            if (row.id != interestId) {
                await this.storage.interest.delete(row.id);
                row.id = interestId;
                changed = true;
            } else {
                changed = !this.compareInterest(row.interest, interest);
            }
            if (changed) {
                !row.history && (row.history = {});
                row.history[lastVersion] = row.interest;
                row.status = interest.status;
                row.interest = interest;
            }
        } else {
            row = {
                id: interestId,
                subject: subjectId,
                version: version,
                type: type,
                status: interest.status,
                interest: interest,
            };
        }
        await this.storage.interest.put(row);
        this.step();
    }

    async run() {
        let version = this.jobId;
        this.total = await this.getTotal();
        if (this.total == 0) {
            return;
        }
        await this.storage.table('version').put({table: 'interest', version: version, updated: Date.now()});

        let baseURL = URL_INTERESTS
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.targetUser.id);

        for (let type of ['game', 'music', 'book', 'movie', 'drama']) {
            let urlWithType = baseURL.replace('{type}', type);

            for (let status of ['mark', 'doing', 'done']) {
                let urlWithStatus = urlWithType.replace('{status}', status);
                let pageCount = 1;
                for (let i = 0; i < pageCount; i ++) {
                    let start = i * PAGE_SIZE;
                    let urlToFetch = urlWithStatus
                        .replace('{start}', start)
                        .replace('{count}', PAGE_SIZE);
                    let response = await this.fetch(urlToFetch, {headers: {'X-Override-Referer': 'https://m.douban.com/mine/' + type}});
                    if (response.status != 200) {
                        if (response.status == 500) {
                            // try to fetch this page sliced
                            for (let j = 0; j < PAGE_SIZE; j ++) {
                                let startSliced = start + j;
                                let urlToFetchSliced = urlWithStatus
                                    .replace('{start}', startSliced)
                                    .replace('{count}', 1);
                                let response = await this.fetch(urlToFetchSliced, {headers: {'X-Override-Referer': 'https://m.douban.com/mine/' + type}});
                                if (response.status != 200) {
                                    // skip douban server error
                                    continue;
                                }
                                let json = await response.json();
                                for (let interest of json.interests) {
                                    await this.processInterest(interest, version, type);
                                }
                                if (json.total == startSliced) {
                                    continue;
                                }
                            }
                        } else {
                            throw new TaskError('豆瓣服务器返回错误: ' + response.status);
                        }
                        continue;
                    }
                    let json = await response.json();
                    pageCount = Math.ceil(json.total / PAGE_SIZE);
                    for (let interest of json.interests) {
                        await this.processInterest(interest, version, type);
                    }
                }
            }
        }
        this.complete();
    }

    get name() {
        return '书/影/音/游';
    }
}
