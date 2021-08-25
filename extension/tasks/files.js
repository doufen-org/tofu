'use strict';
import {TaskError, Task} from '../service.js';
import Settings from '../settings.js';


export const TASK_FILES_SETTINGS = {
    '同步图片.cloudName': '',
};

const UPLOAD_URL = 'https://api.cloudinary.com/v1_1/{cloud}/image/upload';
const PAGE_SIZE = 100;


function encodeContext(context) {
    let contextArray = [];
    for (let key in context) {
        let value = context[key];
        if (value.length > 100) {
            value = value.substring(0, 100);
        }
        key = key.replaceAll('|', '\|').replaceAll('=', '\=');
        value = value.replaceAll('|', '\|').replaceAll('=', '\=');
        contextArray.push(`${key}=${value}`);
    }
    return contextArray.join('|');
}


export default class Files extends Task {
    async addFile(url, tags, meta, path) {
        if (!url) {
            return;
        }
        try {
            await this.storage.files.add({
                url: url,
                tags: tags,
                meta: meta,
                path: path,
            });
        } catch (e) {
            if (e.name != 'ConstraintError') {
                this.logger.warning(e.message);
            }
        }
    }

    async extractImages() {
        let escapeFolderName = name => {
            name = name.replaceAll('?', '？')
                .replaceAll('&', '＆')
                .replaceAll('#', '＃')
                .replaceAll('\\', '＼')
                .replaceAll('%', '％')
                .replaceAll('<', '＜')
                .replaceAll('>', '＞')
                .replaceAll('/', '／');
            return name;
        };

        await this.storage.transaction('rw', this.storage.album, this.storage.files, async () => {
            await this.storage.album.each(async item => {
                await this.addFile(
                    item.album.cover_url,
                    ['相册'],
                    {
                        caption: item.album.title,
                        alt: item.album.description,
                        from: item.album.url,
                    },
                    'thumbnail'
                );
            });
        });
        await this.storage.transaction('rw', this.storage.album, this.storage.photo, this.storage.files, async () => {
            await this.storage.photo.each(async item => {
                let {album} = await this.storage.album.get(item.album);
                let meta = {
                    caption: album.title,
                    alt: item.photo.description,
                    from: item.photo.url,
                };
                await this.addFile(
                    item.photo.cover,
                    ['照片'],
                    meta,
                    'thumbnail'
                );
                await this.addFile(
                    item.photo.raw,
                    ['照片'],
                    meta,
                    '相册/' + escapeFolderName(album.title)
                );
            });
        });
        await this.storage.transaction('rw', this.storage.note, this.storage.files, async () => {
            await this.storage.note.each(async item => {
                let images = this.parseHTML(item.note.fulltext).querySelectorAll('img');
                for (let image of images) {
                    await this.addFile(
                        image.src,
                        ['日记'],
                        {
                            caption: item.note.title,
                            alt: item.note.abstract,
                            from: item.note.url,
                        },
                        '日记/' + escapeFolderName(item.note.title)
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
                        ['评论'],
                        {
                            caption: item.review.title,
                            alt: item.review.abstract,
                            from: item.review.url,
                        },
                        '评论/' + escapeFolderName(item.review.title)
                    );
                }
            });
        });
        await this.storage.transaction('rw', this.storage.annotation, this.storage.files, async () => {
            await this.storage.annotation.each(async item => {
                let images = this.parseHTML(item.annotation.fulltext).querySelectorAll('img');
                for (let image of images) {
                    await this.addFile(
                        image.src,
                        ['笔记'],
                        {
                            caption: item.annotation.title,
                            alt: item.annotation.abstract,
                            from: item.annotation.url,
                        },
                        '笔记/' + escapeFolderName(item.annotation.title)
                    );
                }
            });
        });
        await this.storage.transaction('rw', this.storage.status, this.storage.files, async () => {
            await this.storage.status.each(async item => {
                if (item.status.images) {
                    let statusUrl = item.status.sharing_url;
                    for (let image of item.status.images) {
                        await this.addFile(image.large.url, ['广播'], { from: statusUrl }, '广播');
                        await this.addFile(image.normal.url, ['广播'], { from: statusUrl }, 'thumbnail');
                    }
                }
                if (item.status.reshared_status && item.status.reshared_status.images) {
                    let statusUrl = item.status.reshared_status.sharing_url;
                    for (let image of item.status.reshared_status.images) {
                        await this.addFile(image.large.url, ['广播'], { from: statusUrl }, '广播');
                        await this.addFile(image.normal.url, ['广播'], { from: statusUrl }, 'thumbnail');
                    }
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

        let escapePath = path => {
            let dirs = path.split('/');
            let folderName = dirs.pop();
            if (folderName.trim() == '') {
                folderName = folderName.replaceAll(' ', '␣');
            } else if (folderName.startsWith(' ')) {
                folderName = folderName.replace('.', '␣');
            } else if (folderName.replaceAll('.', '') == '') {
                folderName = folderName.replaceAll('.', '·');
            } else if (folderName.startsWith('.')) {
                folderName = folderName.replace('.', '·');
            }
            dirs.push(folderName);
            return dirs.join('/');
        };

        let uploadURL = UPLOAD_URL.replace('{cloud}', this.cloudName);

        let pageCount = Math.ceil(this.total / PAGE_SIZE);
        for (let i = 0; i < pageCount; i ++) {
            let rows = await this.storage.files.filter(row => {
                return !(row.save);
            }).limit(PAGE_SIZE).toArray();

            for (let row of rows) {
                if (!row.url) {
                    this.step();
                    continue;
                }
                let postData = new URLSearchParams();
                postData.append('file', row.url);
                postData.append('upload_preset', 'douban');
                postData.append('tags', row.tags);
                postData.append('context', encodeContext(row.meta));
                postData.append('folder', `${this.targetUser.uid}/${escapePath(row.path)}`);

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
