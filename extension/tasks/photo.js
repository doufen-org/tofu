'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 20;
const URL_PHOTOS = 'https://www.douban.com/people/{uid}/photos?start={start}';


export default class Photo extends Task {
    async run() {
        await this.storage.table('version').put({table: 'photo', version: this.jobId, updated: Date.now()});

        let baseURL = URL_PHOTOS
            .replace('{uid}', this.session.userId);

        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(baseURL.replace('{start}', i * PAGE_SIZE));
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let html =  this.parseHTML(await response.text());
            pageCount = parseInt(html.querySelector('.paginator .thispage').dataset.totalPage);
            for (let item of html.querySelectorAll('.albumlst')) {
                let photoURL = item.querySelector('.album_photo').href;
                let coverURL = item.querySelector('.album').src;
            }
        }
    }

    get name() {
        return '相册';
    }
}
