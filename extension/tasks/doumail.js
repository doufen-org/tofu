'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 20;
const URL_DOUMAIL = 'https://www.douban.com/doumail/?start={start}';


export default class Photo extends Task {
    async run() {
        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(URL_DOUMAIL.replace('{start}', i * PAGE_SIZE));
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let html =  this.parseHTML(await response.text());
            try {
                pageCount = parseInt(html.querySelector('.paginator .thispage').dataset.totalPage);
            } catch (e) {}
        }
    }

    get name() {
        return '豆邮';
    }
}
