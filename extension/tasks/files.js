'use strict';
import {TaskError, Task} from '../service.js';


export default class Files extends Task {

    async run() {
        let statusCount = await this.storage.status.count(),
            noteCount = await this.storage.note.count(),
            reviewCount = await this.storage.review.count(),
            albumCount = await this.storage.album.count(),
            photoCount = await this.storage.photo.count();
        this.total = statusCount + noteCount + reviewCount + albumCount + photoCount;
        await this.storage.transaction('rw', this.storage.album, this.storage.files, async () => {
            await this.storage.album.each(async item => {
                try {
                    await this.storage.files.put({
                        url: item.album.cover_url,
                        source: item.album.url,
                    })
                } catch (e) { }
                this.step();
            });
        });
        await this.storage.transaction('rw', this.storage.photo, this.storage.files, async () => {
            await this.storage.photo.each(async item => {
                try {
                    await this.storage.files.put({
                        url: item.photo.cover.replace('/m/','/l/'),
                        source: item.photo.url,
                    })
                } catch (e) { }
                this.step();
            });
        });
        this.complete();
    }

    get name() {
        return '同步图片';
    }
}
