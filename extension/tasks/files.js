'use strict';
import {TaskError, Task} from '../service.js';
import Settings from '../settings.js';


export const TASK_FILES_SETTINGS = {
    '同步图片.cloudName': '',
};

const UPLOAD_URL = 'https://api.cloudinary.com/v1_1/{cloud}/image/upload';
const PAGE_SIZE = 100;


export default class Files extends Task {
    async addFile(url, source, tags) {
        try {
            await this.storage.files.add({
                url: url,
                source: source,
                tags: tags,
            });
        } catch (e) {
            if (e.name != 'ConstraintError') {
                this.logger.warning(e.message);
            }
        }
    }

    async extractImages() {
        await this.storage.transaction('rw', this.storage.album, this.storage.files, async () => {
            await this.storage.album.each(async item => {
                await this.addFile(
                    item.album.cover_url,
                    item.album.url,
                    ['相册']
                );
            });
        });
        await this.storage.transaction('rw', this.storage.photo, this.storage.files, async () => {
            await this.storage.photo.each(async item => {
                await this.addFile(
                    item.photo.cover.replace('/m/','/l/'),
                    item.photo.url,
                    ['照片']
                );
            });
        });
        await this.storage.transaction('rw', this.storage.status, this.storage.files, async () => {
            await this.storage.status.each(async item => {
                if (item.status.images) {
                    let statusUrl = item.status.sharing_url;
                    for (let image of item.status.images) {
                        await this.addFile(image.large.url, statusUrl, ['广播']);
                        await this.addFile(image.normal.url, statusUrl, ['广播']);
                    }
                }
                if (item.status.reshared_status && item.status.reshared_status.images) {
                    let statusUrl = item.status.reshared_status.sharing_url;
                    for (let image of item.status.reshared_status.images) {
                        await this.addFile(image.large.url, statusUrl, ['广播']);
                        await this.addFile(image.normal.url, statusUrl, ['广播']);
                    }
                }
            });
        });
        await this.storage.transaction('rw', this.storage.note, this.storage.files, async () => {
            await this.storage.note.each(async item => {
                let images = this.parseHTML(item.note.fulltext).querySelectorAll('img');
                for (let image of images) {
                    await this.addFile(
                        image.src,
                        item.note.url,
                        ['日记']
                    );
                }
            });
        });
        await this.storage.transaction('rw', this.storage.review, this.storage.files, async () => {
            await this.storage.review.each(async item => {
                let images = this.parseHTML(item.review.fulltext).querySelectorAll('img');
                for (let image of images) {
                    await this.addFile(
                        image.src,
                        item.review.url,
                        ['评论']
                    );
                }
            });
        });
    }

    async run() {
        let settings = await Settings.load(TASK_FILES_SETTINGS);
        Settings.apply(this, settings);
        if (!this.cloudName) {
            this.logger.warning('Missing setting of cloudinary cloud name.');
            return;
        }

        await this.extractImages();

        this.total = await this.storage.files.filter(row => {
            return !(row.save);
        }).count();
        if (this.total == 0) {
            return;
        }

        let uploadURL = UPLOAD_URL.replace('{cloud}', this.cloudName);

        let pageCount = Math.ceil(this.total / PAGE_SIZE);
        for (let i = 0; i < pageCount; i ++) {
            let rows = await this.storage.files.filter(row => {
                return !(row.save);
            }).limit(PAGE_SIZE).toArray();

            for (let row of rows) {
                let postData = new URLSearchParams();
                postData.append('file', row.url);
                postData.append('upload_preset', 'douban');
                postData.append('tags', row.tags);
                let response = await this.fetch(uploadURL, {
                    method: 'POST',
                    body: postData,
                }, true);
                if (response.status >= 500) {
                    throw new TaskError('Cloudinary 接口异常');
                }
                let savedData = await response.json();
                if (response.status == 400 && !savedData['error']['message'].startsWith('Error in loading http')) {
                    throw new TaskError('Cloudinary 接口返回错误');
                }
                await this.storage.files.update(row.id, {
                    save: savedData,
                })
                this.step();
            }
        }

        this.complete();
    }

    get name() {
        return '同步图片';
    }
}
