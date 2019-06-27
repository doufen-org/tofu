'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 50;
const URL_DOULIST = 'https://m.douban.com/rexxar/api/v2/user/{uid}/{type}_doulists?start={start}&count=50&ck={ck}&for_mobile=1';


export default class Doulist extends Task {
    async run() {
        let baseURL = URL_DOULIST
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        for (let type of ['owned', 'following']) {
            let urlWithType = baseURL.replace('{type}', type);
            let pageCount = 1;
            for (let i = 0; i < pageCount; i ++) {
                let response = await this.fetch(urlWithType.replace('{start}', i * PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/doulist'}});
                if (response.status != 200) {
                    throw new TaskError('豆瓣服务器返回错误');
                }
                let json = await response.json();
                pageCount = Math.ceil(json.total / PAGE_SIZE);
                for (let doulist of json.doulists) {
                    let doulistId = parseInt(doulist.id);
                    let row = {
                        id: doulistId,
                        type: type,
                        doulist: doulist,
                    };
                    const DOULIST_PAGE_SIZE = 25;
                    let doulistTotalPage = 1;
                    for (let i = 0; i < doulistTotalPage; i ++) {
                        let response = await this.fetch(doulist.url + '?start=' + i * DOULIST_PAGE_SIZE);
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
                            let doulistItem = {
                                id: itemId,
                                doulist: doulistId,
                                type: itemTypes,
                                source: itemSource,
                                abstract: itemAbstract ? itemAbstract.innerText : null,
                                item: {
                                    id: parseInt(addBtn.dataset.id),
                                    category: parseInt(addBtn.dataset.cate),
                                    category_name: addBtn.dataset.catename,
                                    url: addBtn.dataset.url,
                                    title: addBtn.dataset.title,
                                    can_view: addBtn.dataset.canview == 'True',
                                    is_url_subject: addBtn.dataset.isurlsubject == 'true',
                                    picture: addBtn.dataset.picture,
                                }
                            }
                            await this.storage.doulistItem.put(doulistItem);
                        }
                    }
                    await this.storage.doulist.put(row);
                }
            }
        }
    }

    get name() {
        return '豆列';
    }
}