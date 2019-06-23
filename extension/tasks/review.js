'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_REVIEWS = 'https://m.douban.com/rexxar/api/v2/user/{uid}/reviews?type={type}&start={start}&count=50&ck={ck}&for_mobile=1';


export default class Review extends Task {
    async run() {
        await this.storage.table('version').put({table: 'review', version: this.jobId, updated: Date.now()});

        let baseURL = URL_REVIEWS
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        for (let type of ['music', 'book', 'movie']) {
            let fullURL = baseURL.replace('{type}', type);
            let pageCount = 1;
            for (let i = 0; i < pageCount; i ++) {
                let response = await this.fetch(fullURL.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/' + type}});
                if (response.status != 200) {
                    throw new TaskError('豆瓣服务器返回错误');
                }
                let json = await response.json();
                pageCount = Math.ceil(json.total / PAGE_SIZE);
                for (let review of json.reviews) {
                    let response = await this.fetch(review.url);
                    if (response.status != 200) {
                        review.fulltext = null;
                    } else {
                        let html = this.parseHTML(await response.text());
                        review.fulltext = html.querySelector('.review-content').innerHTML;
                    }
                    let row = {
                        id: parseInt(review.id),
                        type: type,
                        version: this.jobId,
                        review: review,
                    }
                    await this.storage.review.put(row);
                }
            }
        }
    }

    get name() {
        return '评论';
    }
}
