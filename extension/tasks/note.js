'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_NOTES = 'https://m.douban.com/rexxar/api/v2/user/{uid}/notes?start={start}&count=50&ck={ck}&for_mobile=1';


export default class Note extends Task {
    async run() {
        this.total = this.session.userInfo.notes_count;
        await this.storage.table('version').put({table: 'note', version: this.jobId, updated: Date.now()});

        let baseURL = URL_NOTES
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(baseURL.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/notes'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            pageCount = Math.ceil(json.total / PAGE_SIZE);
            for (let note of json.notes) {
                let response = await this.fetch(note.url);
                if (response.status != 200) {
                    note.fulltext = null;
                } else {
                    let html = this.parseHTML(await response.text());
                    note.fulltext = html.querySelector('#link-report>.note').innerHTML;
                }
                let row = {
                    id: parseInt(note.id),
                    version: this.jobId,
                    note: note,
                }
                await this.storage.note.put(row);
                this.step();
            }
        }
        this.complete();
    }

    get name() {
        return '日记';
    }
}
