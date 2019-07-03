'use strict';
import {TaskError, Task} from '../service.js';


const API_PAGE_SIZE = 50;
const WEB_PAGE_SIZE = 20;
const URL_FOLLOWING_API = 'https://m.douban.com/rexxar/api/v2/user/{uid}/following?start={start}&count=50&ck={ck}&for_mobile=1';
const URL_FOLLOWING_WEBPAGE = 'https://www.douban.com/contacts/list?start={start}';


export default class Following extends Task {
    async crawlByApi() {
        let baseURL = URL_FOLLOWING_API
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(baseURL.replace('{start}', i * API_PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/followed'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            pageCount = Math.ceil(json.total / API_PAGE_SIZE);
            for (let user of json.users) {
                let row = {
                    version: this.jobId,
                    user: user,
                };
                await this.storage.following.put(row);
                this.step();
            }
        }
    }

    async crawlByWebpage() {
        let totalPage = 1;
        for (let i = 0; i < totalPage; i ++) {
            let response = await this.fetch(URL_FOLLOWING_WEBPAGE.replace('{start}', i * WEB_PAGE_SIZE));
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let html =  this.parseHTML(await response.text());
            try {
                totalPage = parseInt(html.querySelector('.paginator .thispage').dataset.totalPage);
            } catch (e) {}
            for (let li of html.querySelectorAll('.user-list>li')) {
                let idText = li.id.substr(1);
                let avatar = li.querySelector('.face');
                let userLink = li.querySelector('.info>h3>a').href;
                let locInfo = li.querySelector('.loc');
                let signatureInfo = li.querySelector('.signature');
                let remarkInfo = li.querySelector('.remark');
                let loc = locInfo ? { name: locInfo.innerText.replace('常居：', '') } : null;
                let signature = signatureInfo ? signatureInfo.innerText.replace('签名：', '') : null;
                let remark = remarkInfo ? remarkInfo.innerText.match(/（备注：(.+)）/)[1] : null;
                let row = {
                    version: this.jobId,
                    user: {
                        avatar: avatar.src,
                        id: idText,
                        loc: loc,
                        name: avatar.alt,
                        uid: userLink.match(/https:\/\/www\.douban\.com\/people\/(.+)\//)[1],
                        uri: 'douban://douban.com/user/' + idText,
                        url: userLink,
                        signature: signature,
                        remark: remark,
                        followers_count: null,
                    }
                };
                await this.storage.following.put(row);
                this.step();
            }
        }
    }

    async run() {
        this.total = this.session.userInfo.following_count;
        await this.storage.table('version').put({table: 'following', version: this.jobId, updated: Date.now()});
        this.session.userInfo.following_count > 5000 ? await this.crawlByWebpage() : await this.crawlByApi();
        this.complete();
    }

    get name() {
        return '关注';
    }
}
