'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_PHOTOS = 'https://m.douban.com/rexxar/api/v2/user/{uid}/photo_albums?start={start}&count=50&ck={ck}&for_mobile=1';


export default class Photo extends Task {
    async run() {
        let baseURL = URL_PHOTOS
            .replace('{uid}', this.session.userId)
            .replace('{ck}', this.session.cookies.ck);

        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(baseURL.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/photos'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            pageCount = Math.ceil(json.total / PAGE_SIZE);
            for (let album of json.photo_albums) {
                let albumId = parseInt(album.id);
                if (isNaN(albumId)) continue;
                let row = {
                    id: albumId,
                    album: album,
                };
                const ALBUM_PAGE_SIZE = 18;
                let albumTotalPage = 1;
                for (let i = 0; i < albumTotalPage; i ++) {
                    let response = await this.fetch(album.url + '?m_start=' + i * ALBUM_PAGE_SIZE);
                    if (response.status != 200) {
                        if (response.status < 500) continue;
                        throw new TaskError('豆瓣服务器返回错误');
                    }
                    let html = this.parseHTML(await response.text());
                    try {
                        albumTotalPage = parseInt(html.querySelector('.paginator .thispage').dataset.totalPage);
                    } catch (e) {}
                    for (let photoAnchor of html.querySelectorAll('.photolst_photo')) {
                        let photoImg = photoAnchor.querySelector('img');
                        let photoId = photoAnchor.href.match(/https:\/\/www\.douban\.com\/photos\/photo\/(\d+)\//)[1];
                        let photo = {
                            id: parseInt(photoId),
                            album: albumId,
                            url: photoAnchor.href,
                            cover: photoImg.src,
                            description: photoAnchor.title,
                        }
                        await this.storage.photo.put(photo);
                    }
                }
                await this.storage.album.put(row);
            }
        }
    }

    get name() {
        return '相册';
    }
}
