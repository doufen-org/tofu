'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_ANNOTATIONS = 'https://m.douban.com/rexxar/api/v2/user/{uid}/annotations?start={start}&count=50&ck={ck}&for_mobile=1';


export default class Annotation extends Task {
    async fetchAnnotation(url) {
        let response = await this.fetch(url);
        if (response.status != 200) {
            return;
        }
        let html = this.parseHTML(await response.text());
        return html.querySelector('#link-report>.note').innerHTML;
    }

    async run() {
        let version = this.jobId;
        this.total = this.targetUser.notes_count;
        if (this.total == 0) {
            return;
        }
        await this.storage.table('version').put({table: 'annotation', version: version, updated: Date.now()});

        let baseURL = URL_ANNOTATIONS
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.targetUser.id);

        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(baseURL.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            pageCount = Math.ceil(json.total / PAGE_SIZE);
            for (let collection of json.collections) {
                let row = await this.storage.annotation.get(parseInt(collection.id));
                if (row) {
                    let lastVersion = row.version;
                    row.version = version;
                    if (note.update_time != row.note.update_time) {
                        !row.history && (row.history = {});
                        row.history[lastVersion] = row.note;
                        note.fulltext = await this.fetchAnnotation(note.url);
                        row.note = note;
                    }
                } else {
                    note.fulltext = await this.fetchAnnotation(note.url);
                    row = {
                        id: parseInt(note.id),
                        version: version,
                        note: note,
                    }
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
