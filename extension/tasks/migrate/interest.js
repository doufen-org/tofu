'use strict';
import {Task} from '../../service.js';


const URL_MARK_INTEREST = 'https://www.douban.com/j/contact/addtoblacklist';
const PAGE_SIZE = 100;


export default class Note extends Task {
    async run() {
        this.total = await this.storage.interest.count();
        if (this.total == 0) {
            return;
        }

        let postData = new URLSearchParams();
        let pageCount = Math.ceil(this.total / PAGE_SIZE);
        for (let i = 0; i < pageCount; i ++) {
            let rows = await this.storage.interest
                .offset(PAGE_SIZE * i).limit(PAGE_SIZE)
                .toArray();
            for (let row of rows) {
                this.step();
            }
        }
        this.complete();
    }
}
