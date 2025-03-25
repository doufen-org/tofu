'use strict';
import Task from '../services/Task.js';
import TaskError from '../services/TaskError.js';


const PAGE_SIZE = 50;
const URL_DOULIST = 'https://m.douban.com/rexxar/api/v2/user/{uid}/{type}_doulists?start={start}&count=50&ck={ck}&for_mobile=1';


export default class Doulist extends Task {
    compareDoulist(l, r) {
        if (l.desc != r.desc) return false;
        if (l.title != r.title) return false;
        if (l.tags.sort().toString() != r.tags.sort().toString()) return false;
        return true;
    }

    compareDoulistItem(l, r) {
        if (l.comment != r.comment) return false;
        return true;
    }

    async run() {
        let version = this.jobId;
        this.total = this.targetUser.following_doulist_count + this.targetUser.owned_doulist_count;
        if (this.total == 0) {
            return;
        }
        await this.storage.table('version').put({table: 'doulist', version: version, updated: Date.now()});

        let baseURL = URL_DOULIST
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.targetUser.id);

        for (let type of ['owned', 'following']) {
            let urlWithType = baseURL.replace('{type}', type);
            let pageCount = 1;
            for (let i = 0; i < pageCount; i ++) {
                let fetch = await this.fetch
                let response = await fetch(urlWithType.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/doulist'}});
                if (response.status != 200) {
                    throw new TaskError('豆瓣服务器返回错误');
                }
                let json = await response.json();
                pageCount = Math.ceil(json.total / PAGE_SIZE);
                for (let doulist of json.doulists) {
                    let doulistId = parseInt(doulist.id);
                    let row = await this.storage.doulist.get(doulistId);
                    if (row) {
                        let lastVersion = row.version;
                        row.version = version;
                        if (!this.compareDoulist(doulist, row.doulist)) {
                            !row.history && (row.history = {});
                            row.history[lastVersion] = row.doulist;
                            row.doulist = doulist;
                        }
                    } else {
                        row = {
                            id: doulistId,
                            type: type,
                            version: version,
                            doulist: doulist,
                        };
                    }
                    const DOULIST_PAGE_SIZE = 25;
                    let doulistTotalPage = 1;
                    for (let i = 0; i < doulistTotalPage; i ++) {
                        let fetch = await this.fetch
                        let response = await fetch(doulist.url + '?start=' + i * DOULIST_PAGE_SIZE);
                        if (response.status != 200) {
                            if (response.status < 500) continue;
                            throw new TaskError('豆瓣服务器返回错误');
                        }
                        let html = this.parseHTML(await response.text());
                        try {
                            doulistTotalPage = parseInt(html.querySelector('.paginator .thispage').dataset.totalPage);
                        } catch (e) {}
                        for (let item of html.querySelectorAll('.doulist-item')) {
                            let addBtn = item.querySelector('.lnk-doulist-add');
                            if (!addBtn) continue;
                            let itemId = parseInt(item.id.substr(4));
                            let itemBody = item.querySelector('.bd');
                            let itemTypes = [];
                            for (let itemType of itemBody.classList) {
                                if (itemType.startsWith('doulist-')) {
                                    itemTypes.push(itemType.substr(8));
                                }
                            }
                            let itemSource = item.querySelector('.source').innerText.trim().substr(3);
                            let itemAbstract = item.querySelector('.abstract');
                            let commentBlockquote = item.querySelector('.comment-item>.comment');
                            let extra = {};
                            let itemCategory = parseInt(addBtn.dataset.cate);
                            if (itemCategory == 3055) {
                                // 广播
                                try {
                                    let statusText = item.querySelector('.status-text');
                                    let statusImages = [];
                                    for (let statusImage of item.querySelectorAll('.status-images>a')) { 
                                        statusImages.push(statusImage.style.backgroundImage.slice(5,-2));
                                    }
                                    let status = {
                                        text: statusText.innerText.trim(),
                                        images: statusImages,
                                    };
                                    extra.status = status;
                                } catch (e) { }
                            }
                            let itemEntity = {
                                id: parseInt(addBtn.dataset.id),
                                type: itemTypes,
                                category: itemCategory,
                                category_name: addBtn.dataset.catename,
                                url: addBtn.dataset.url,
                                title: addBtn.dataset.title,
                                can_view: addBtn.dataset.canview == 'True',
                                is_url_subject: addBtn.dataset.isurlsubject == 'true',
                                picture: addBtn.dataset.picture,
                                abstract: itemAbstract ? itemAbstract.innerText : null,
                                source: itemSource,
                                comment: commentBlockquote ? commentBlockquote.innerText : null,
                                extra: extra,
                            };
                            let row = await this.storage.doulistItem.get(itemId);
                            if (row) {
                                let lastVersion = row.version;
                                row.version = version;
                                if (!this.compareDoulistItem(item, row.item)) {
                                    !row.history && (row.history = {});
                                    row.history[lastVersion] = row.item;
                                    row.item = itemEntity;
                                }
                            } else {
                                row = {
                                    id: itemId,
                                    doulist: doulistId,
                                    version: version,
                                    item: itemEntity,
                                }    
                            }
                            await this.storage.doulistItem.put(row);
                        }
                    }
                    await this.storage.doulist.put(row);
                    this.step();
                }
            }
        }
        this.complete();
    }

    get name() {
        return '豆列';
    }
}
