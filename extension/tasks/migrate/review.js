'use strict';
import Task from '../../services/Task.js';
import TaskError from '../../services/TaskError.js';
import Draft from '../../vendor/draft.js';


const URL_REVIEW_PUBLISH = 'https://www.douban.com/j/review/create';
const URL_REVIEW_CREATE_REFERER = 'https://www.douban.com/subject/{subject}/new_review';
const PAGE_SIZE = 100;
const WORD_COUNT_LIMIT = 140;


export default class Review extends Task {
    getIntro(html) {
        let intro = html.querySelector('div.introduction');
        if (intro) {
            let introText = intro.innerText;
            intro.remove();
            return introText;
        }
        return '';
    }

    async uploadImages() {

    }

    async run() {
        this.total = await this.storage.review.count();
        if (this.total == 0) {
            return;
        }

        let postData = new URLSearchParams();
        postData.append('ck', this.session.cookies.ck);
        postData.append('is_rich', '1');
        postData.append('topic_id', '');
        postData.set('review[rating]', '');
        postData.set('review[spoiler]', '');
        postData.set('review[donate]', '');
        postData.set('review[original]', '');

        let pageCount = Math.ceil(this.total / PAGE_SIZE);
        for (let i = 0; i < pageCount; i ++) {
            let rows = await this.storage.review
                .offset(PAGE_SIZE * i).limit(PAGE_SIZE)
                .toArray();
            for (let row of rows) {
                let review = row.review;
                let html = this.parseHTML(review.fulltext).querySelector('body');
                let intro = this.getIntro(html);

                let draft = new Draft();
                draft.feed(html);

                let wordPadding = WORD_COUNT_LIMIT - draft.count();
                if (wordPadding > 0) {
                    draft.addBlock('unstyled').write(''.padEnd(wordPadding, '=')).end();
                }

                postData.set('review[introduction]', intro);
                postData.set('review[subject_id]', row.subject);
                postData.set('review[title]', review.title);
                postData.set('review[text]', JSON.stringify(draft.toArray()));

                let fetch = await this.fetch
                let response = await fetch(URL_REVIEW_PUBLISH, {
                    headers: {
                        'X-Override-Referer': URL_REVIEW_CREATE_REFERER.replace('{subject}', row.subject),
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Override-Origin': 'https://www.douban.com',
                    },
                    method: 'POST',
                    body: postData,
                });
                let result = await response.json();
                if (result.result) {
                    this.logger.info('Success to publish review:' + review.title);
                } else {
                    this.logger.warning('Fail to publish review:' + review.title);
                }
                this.step();
            }
        }
        this.complete();
    }

    get name() {
        return '发布评论';
    }
}
