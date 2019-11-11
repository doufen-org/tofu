'use strict';
import {Task} from '../../service.js';


const URL_INTEREST = {
    movie: 'https://movie.douban.com/j/subject/{subject_id}/interest',
    music: 'https://music.douban.com/j/subject/{subject_id}/interest',
    book: 'https://book.douban.com/j/subject/{subject_id}/interest',
    game: 'https://www.douban.com/j/ilmen/thing/{subject_id}/interest',
    drama: 'https://www.douban.com/j/location/drama/{subject_id}/interest',
};

const MARKS = {
    mark: 'wish',
    doing: 'do',
    done: 'collect',
};

const PAGE_SIZE = 100;


export default class Note extends Task {
    async run() {
        this.total = await this.storage.interest.count();
        if (this.total == 0) {
            return;
        }

        let postData = new URLSearchParams();
        postData.append('ck', this.session.cookies.ck);
        postData.append('foldcollect', 'F');

        let pageCount = Math.ceil(this.total / PAGE_SIZE);
        for (let i = 0; i < pageCount; i ++) {
            let rows = await this.storage.interest
                .offset(PAGE_SIZE * i).limit(PAGE_SIZE)
                .toArray();
            for (let row of rows) {
                let interest = row.interest;
                postData.set('rating', interest.rating ? interest.rating.value : '');
                postData.set('interest', MARKS[row.status]);
                postData.set('tags', interest.tags ? interest.tags.join(' ') : '');
                postData.set('comment', interest.comment + ' @' + interest.create_time);

                let response = await this.fetch(URL_INTEREST[row.type].replace('{subject_id}', row.subject), {
                    headers: {
                        'X-Override-Referer': 'https://www.douban.com/',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Override-Origin': 'https://www.douban.com',
                    },
                    method: 'POST',
                    body: postData,
                });
                let result = await response.json();
                this.step();
            }
        }
        this.complete();
    }

    get name() {
        return '标记影音书游剧';
    }
}
