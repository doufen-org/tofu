'use strict';
import {Task} from '../../service.js';
import Draft from '../../vendor/draft.js';


const URL_NOTE_PUBLISH = 'https://www.douban.com/j/note/publish';
const URL_NOTE_CREATE_REFERER = 'https://www.douban.com/note/create';
const PAGE_SIZE = 100;


export default class Note extends Task {
    async run() {
        this.total = await this.storage.note.count();
        if (this.total == 0) {
            return;
        }

        let postData = new URLSearchParams();
        postData.append('ck', this.session.cookies.ck);
        postData.append('is_rich', '1');
        postData.append('note_id', '');
        postData.append('note_privacy', 'X');
        postData.append('action', 'new');

        let pageCount = Math.ceil(this.total / PAGE_SIZE);
        for (let i = 0; i < pageCount; i ++) {
            let rows = await this.storage.note
                .offset(PAGE_SIZE * i).limit(PAGE_SIZE)
                .toArray();
            for (let row of rows) {
                let draft = new Draft();
                let note = row.note;
                let noteHTML = this.parseHTML(note.fulltext).querySelector('body');
                draft.feed(noteHTML);
                let noteIntro = noteHTML.querySelector('div.introduction');
                if (noteIntro) {
                    postData.set('introduction', noteIntro.innerText);
                    noteIntro.remove();
                } else {
                    postData.set('introduction', '');
                }
                postData.set('note_title', note.title);
                postData.set('note_text', JSON.stringify(draft.toArray()));
                let response = await this.fetch(URL_NOTE_PUBLISH, {
                    headers: {
                        'X-Override-Referer': URL_NOTE_CREATE_REFERER,
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Override-Origin': 'https://www.douban.com',
                    },
                    method: 'POST',
                    body: postData,
                });
                let result = await response.json();
                if (result.result) {
                    this.logger.info('Success to publish note:' + note.title);
                } else {
                    this.logger.warning('Fail to publish note:' + note.title);
                }
                this.step();
            }
        }
        this.complete();
    }

    get name() {
        return '发布日记';
    }
}
