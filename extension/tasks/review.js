'use strict';
import Task from '../services/Task.js';
import TaskError from '../services/TaskError.js';
import Storage  from "../storage.js";

const PAGE_SIZE = 50;
const URL_REVIEWS = 'https://m.douban.com/rexxar/api/v2/user/{uid}/reviews?type={type}&start={start}&count=50&ck={ck}&for_mobile=1';


export default class Review extends Task {
    async fetchReview(url) {
        let fetch = await this.fetch
        let response = await fetch(url);
        if (response.status !== 200) {
            return;
        }
        let html = this.parseHTML(await response.text());
        return html.querySelector('.review-content').innerHTML;
    }

    async run() {
        let version = this.jobId;
        this.total = this.targetUser.reviews_count;
        if (this.total === 0) {
            return;
        }
        await this.storage.table('version').put({table: 'review', version: version, updated: Date.now()});

        let baseURL = URL_REVIEWS
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.targetUser.id);

        for (let type of ['music', 'book', 'movie', 'drama', 'game']) {
            let fullURL = baseURL.replace('{type}', type);
            let pageCount = 1;
            for (let i = 0; i < pageCount; i ++) {
                let response = await (await this.fetch)(fullURL.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/' + type}});
                if (response.status !== 200) {
                    throw new TaskError('豆瓣服务器返回错误');
                }
                let json = await response.json();
                pageCount = Math.ceil(json.total / PAGE_SIZE);
                for (let review of json.reviews) {
                    let fulltext = await this.fetchReview(review.url);
                    let row = await this.storage.review.get(parseInt(review.id));
                    if (row) {
                        let lastVersion = row.version;
                        row.version = version;
                        if (fulltext !== row.review.fulltext) {
                            !row.history && (row.history = {});
                            row.history[lastVersion] = row.review;
                            review.fulltext = fulltext;
                            row.review = review;
                        }
                    } else {
                        review.fulltext = fulltext;
                        row = {
                            id: parseInt(review.id),
                            version: version,
                            type: type,
                            review: review,
                        }
                    }
                    await this.storage.review.put(row);
                    this.step();
                }
            }
        }
        this.complete();
    }

    get name() {
        return '评论';
    }
}
